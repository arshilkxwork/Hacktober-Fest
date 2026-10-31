"""Extract decisions, reasons and rejected alternatives from a thread with the local model.

Long discussions do not fit in one prompt, so the thread is split into windows
of consecutive posts (with a small overlap). For each window the model first
lists the separate questions that were decided or debated, then extracts each
one in its own call; asked for everything at once, a 7B model tends to report
only the most prominent decision. The per-window results are merged: the same
decision found twice is combined, and the latest status other than "open" wins,
because later posts reflect where the discussion ended up.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any, Dict, Iterable, List, Optional, Protocol

from .grounding import ground_decision
from .identity import IdentityResolver
from .models import Alternative, Decision, Evidence, Post, Thread, decision_id

SYSTEM_PROMPT = """You are a careful software archaeologist. You read an excerpt of a public \
technical discussion from an open-source project and record the engineering decisions in it.

A decision is a choice between approaches: something the participants agreed to do, or \
explicitly decided not to do. A discussion usually contains several separate decisions. Record \
each one separately, including:
- the proposal as a whole: was it adopted, and which competing proposals or the option of \
changing nothing did it win or lose against
- design choices inside the proposal: behaviour, syntax, compatibility, scope
- naming choices
For each decision record:
- title: a short name for the question that was decided
- status: "accepted" if the approach was adopted or agreed, "rejected" if the proposal itself \
was turned down, "open" if it is still being debated at the end of the excerpt
- summary: what was decided, in one or two sentences
- rationale: why, using the reasons given by the participants
- evidence: one or more quotes that show the decision
- rejected_alternatives: every other approach that was proposed and turned down, each with \
the reason it was turned down and quotes that show it
- code_refs: file paths, modules, functions, classes, flags or syntax the decision is about, \
exactly as written in the discussion

Rules:
- Use only what the excerpt says. Do not add outside knowledge.
- Every quote must be copied word for word from the post it cites, 6 to 30 words long.
- Cite posts by the number shown in [post N].
- Skip greetings, thanks, off-topic chatter and votes that do not give a reason.
- If the excerpt contains no decisions, return {"decisions": []}."""

_EVIDENCE = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {"post": {"type": "integer"}, "quote": {"type": "string"}},
        "required": ["post", "quote"],
    },
}

SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "decisions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "status": {"type": "string", "enum": ["accepted", "rejected", "open"]},
                    "summary": {"type": "string"},
                    "rationale": {"type": "string"},
                    "evidence": _EVIDENCE,
                    "rejected_alternatives": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "reason": {"type": "string"},
                                "evidence": _EVIDENCE,
                            },
                            "required": ["name", "reason", "evidence"],
                        },
                    },
                    "code_refs": {"type": "array", "items": {"type": "string"}},
                },
                "required": [
                    "title",
                    "status",
                    "summary",
                    "rationale",
                    "evidence",
                    "rejected_alternatives",
                    "code_refs",
                ],
            },
        }
    },
    "required": ["decisions"],
}


TOPICS_PROMPT = """You read an excerpt of a public technical discussion from an open-source \
project. List every separate question that the participants decided or debated in it: whether \
the proposal as a whole should be adopted or a competing proposal (or changing nothing) chosen \
instead, design choices about behaviour, syntax, compatibility or scope, and naming. Write each \
question in a few words and list the posts where it is discussed. Use only what the excerpt says. \
Skip greetings, thanks and off-topic chatter. If nothing was decided or debated, return \
{"topics": []}."""

TOPICS_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "topics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"question": {"type": "string"}, "posts": {"type": "array", "items": {"type": "integer"}}},
                "required": ["question", "posts"],
            },
        }
    },
    "required": ["topics"],
}

MAX_TOPICS = 6


class Backend(Protocol):
    model: str

    def complete_json(self, system: str, user: str, schema: Dict[str, Any]) -> Dict[str, Any]: ...


# --- chunking ----------------------------------------------------------------


def _clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    half = limit // 2
    return text[:half] + "\n[... post shortened ...]\n" + text[-half:]


def render_post(post: Post, limit: int) -> str:
    where = f" on {post.path}:{post.line}" if post.path else ""
    return f"[post {post.id}] {post.author} ({post.created_at[:10]}){where}:\n{_clip(post.body.strip(), limit)}\n"


def chunk_posts(posts: List[Post], budget: int = 14000, overlap: int = 1, post_limit: int = 6000) -> List[List[Post]]:
    """Split posts into windows of at most `budget` characters, overlapping by `overlap` posts."""
    chunks: List[List[Post]] = []
    current: List[Post] = []
    size = 0
    for post in posts:
        cost = len(render_post(post, post_limit))
        if current and size + cost > budget:
            chunks.append(current)
            current = current[-overlap:] if overlap else []
            size = sum(len(render_post(p, post_limit)) for p in current)
        current.append(post)
        size += cost
    if current and (not chunks or current != chunks[-1][-len(current) :]):
        chunks.append(current)
    return chunks


def build_prompt(thread: Thread, posts: List[Post], index: int, total: int, post_limit: int = 6000) -> str:
    head = f"Discussion: {thread.title}\nSource: {thread.url}\nExcerpt {index} of {total}.\n\n"
    return head + "\n".join(render_post(p, post_limit) for p in posts)


# --- parsing model output ----------------------------------------------------


def _evidence(items: Iterable[Dict[str, Any]]) -> List[Evidence]:
    out = []
    for item in items or []:
        quote = str(item.get("quote", "")).strip()
        if quote:
            out.append(Evidence(post_id=str(item.get("post", "")), quote=quote))
    return out


_NOT_CODE = re.compile(r"://|^[\w.-]+\.(org|com|net|io|dev)(/\S*)?$|^PEP\s*\d+|^(class|def|struct)\s+\w{1,2}$", re.I)


def is_code_ref(ref: str) -> bool:
    """Drop what the model lists as code but is a URL, a PEP title or a one-letter example class."""
    return bool(ref) and len(ref) <= 80 and not _NOT_CODE.search(ref)


def parse_decisions(raw: Dict[str, Any], thread: Thread) -> List[Decision]:
    decisions = []
    for d in raw.get("decisions", []) or []:
        title = str(d.get("title", "")).strip()
        if not title:
            continue
        status = d.get("status", "open")
        decisions.append(
            Decision(
                id=decision_id(thread.source, title),
                title=title,
                status=status if status in ("accepted", "rejected", "open") else "open",
                summary=str(d.get("summary", "")).strip(),
                rationale=str(d.get("rationale", "")).strip(),
                evidence=_evidence(d.get("evidence")),
                alternatives=[
                    Alternative(
                        name=str(a.get("name", "")).strip(),
                        reason=str(a.get("reason", "")).strip(),
                        evidence=_evidence(a.get("evidence")),
                    )
                    for a in d.get("rejected_alternatives", []) or []
                    if str(a.get("name", "")).strip()
                ],
                code_refs=[c for c in (str(c).strip() for c in d.get("code_refs", []) or []) if is_code_ref(c)],
                sources=[thread.url],
            )
        )
    return decisions


# --- merging -----------------------------------------------------------------

_STOP = set(
    "a an the of to for in on and or is are be with by as at from that this it its should "
    "use using not no new add support allow".split()
)


def _tokens(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9_]+", text.lower()) if w not in _STOP}


def similar(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    jaccard = len(ta & tb) / len(ta | tb) if ta and tb else 0.0
    return max(jaccard, SequenceMatcher(None, a.lower(), b.lower()).ratio())


def _merge_evidence(into: List[Evidence], new: List[Evidence]) -> None:
    seen = {(e.post_id, e.quote) for e in into}
    for e in new:
        if (e.post_id, e.quote) not in seen:
            into.append(e)
            seen.add((e.post_id, e.quote))


def merge_decisions(batches: List[List[Decision]], threshold: float = 0.6) -> List[Decision]:
    merged: List[Decision] = []
    for batch in batches:
        for d in batch:
            match: Optional[Decision] = None
            for m in merged:
                if similar(m.title, d.title) >= threshold:
                    match = m
                    break
            if match is None:
                merged.append(d)
                continue
            if d.status != "open":
                match.status = d.status
            if len(d.rationale) > len(match.rationale):
                match.rationale = d.rationale
            if len(d.summary) > len(match.summary):
                match.summary = d.summary
            _merge_evidence(match.evidence, d.evidence)
            for alt in d.alternatives:
                same = next((a for a in match.alternatives if similar(a.name, alt.name) >= threshold), None)
                if same is None:
                    match.alternatives.append(alt)
                else:
                    if len(alt.reason) > len(same.reason):
                        same.reason = alt.reason
                    _merge_evidence(same.evidence, alt.evidence)
            for ref in d.code_refs:
                if ref not in match.code_refs:
                    match.code_refs.append(ref)
    return merged


# --- pipeline ----------------------------------------------------------------


def extract_thread(
    thread: Thread,
    backend: Backend,
    identities: Optional[IdentityResolver] = None,
    budget: int = 14000,
    progress=None,
) -> List[Decision]:
    chunks = chunk_posts(thread.posts, budget=budget)
    batches = []
    for i, posts in enumerate(chunks, start=1):
        if progress:
            progress(f"{thread.source}: excerpt {i}/{len(chunks)} (posts {posts[0].id}-{posts[-1].id})")
        excerpt = build_prompt(thread, posts, i, len(chunks))
        topics = backend.complete_json(TOPICS_PROMPT, excerpt, TOPICS_SCHEMA).get("topics", []) or []
        questions = [str(t.get("question", "")).strip() for t in topics]
        if len(questions) > MAX_TOPICS and progress:
            progress(f"  {len(questions) - MAX_TOPICS} more topics in this excerpt not extracted: {'; '.join(questions[MAX_TOPICS:])[:300]}")
        questions = questions[:MAX_TOPICS]
        for question in filter(None, questions):
            focus = f"{excerpt}\nRecord only the decision about this question: {question}"
            batches.append(parse_decisions(backend.complete_json(SYSTEM_PROMPT, focus, SCHEMA), thread))
    decisions = merge_decisions(batches)
    identities = identities or IdentityResolver()
    for d in decisions:
        ground_decision(d, thread)
        people = []
        for ev in d.all_evidence():
            post = thread.post(ev.post_id)
            if ev.verified and post is not None:
                name = identities.canonical(post.platform, post.author, post.display_name)
                if name not in people:
                    people.append(name)
        d.participants = people
    return decisions
