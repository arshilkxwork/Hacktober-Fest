"""Evaluate extraction against a PEP: can we recover its rejected ideas from the discussion alone?

1. Fetch the PEP source and parse its "Rejected Ideas" (or similar) section into items.
2. Load the discussion thread named in the PEP's Discussions-To header.
3. Drop posts that are copies of the PEP text, so the system never sees the answer.
4. Extract decisions from what is left.
5. Match each expected rejected idea to the extracted rejected alternatives,
   first by TF-IDF similarity, then optionally confirmed by the local model.
"""

from __future__ import annotations

import math
import re
import urllib.request
from collections import Counter
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from .grounding import locate
from .models import Decision, Thread

PEP_URL = "https://raw.githubusercontent.com/python/peps/main/peps/pep-{:04d}.rst"
REJECTED_TITLE = re.compile(r"rejected|abandoned|why not", re.I)
ALTERNATIVES_TITLE = re.compile(r"^alternatives?\b|alternatives? (considered|approaches|proposals)", re.I)
UNDERLINE = re.compile(r"^([=\-~^\"'`#*+:.])\1{2,}\s*$")


@dataclass
class Expected:
    title: str
    text: str


@dataclass
class Candidate:
    label: str
    reason: str
    decision_id: str
    verified: bool
    decision_title: str = ""


def fetch_pep(number: int) -> str:
    req = urllib.request.Request(PEP_URL.format(number), headers={"User-Agent": "decisiontrail/0.1"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def pep_header(rst: str, field: str) -> Optional[str]:
    m = re.search(rf"^{field}:\s*(.+)$", rst, re.M)
    return m.group(1).strip() if m else None


def strip_rst(text: str) -> str:
    text = re.sub(r"^\.\. .*$", "", text, flags=re.M)
    text = re.sub(r"`([^`<]+?)\s*<[^>]+>`_{1,2}", r"\1", text)
    text = re.sub(r":pep:`(\d+)`", r"PEP \1", text)
    text = re.sub(r":[\w:+.-]+:`~?([^`]+)`", r"\1", text)
    text = re.sub(r"``([^`]+)``", r"\1", text)
    text = re.sub(r"`([^`]+)`_?", r"\1", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _headings(lines: List[str]) -> List[Tuple[int, str, str]]:
    """(line index, title, underline char) for every RST section heading."""
    out = []
    for i in range(1, len(lines)):
        m = UNDERLINE.match(lines[i])
        title = lines[i - 1].strip()
        if m and title and not UNDERLINE.match(lines[i - 1]) and len(lines[i].strip()) >= len(title):
            out.append((i - 1, title, m.group(1)))
    return out


def rejected_ideas(rst: str) -> List[Expected]:
    lines = rst.splitlines()
    heads = _headings(lines)
    order: List[str] = []
    for _, _, ch in heads:
        if ch not in order:
            order.append(ch)
    level = {ch: i for i, ch in enumerate(order)}

    def end_of(start: int, lvl: int) -> int:
        return next((idx for idx, _, c in heads if idx > start and level[c] <= lvl), len(lines))

    sections = [h for h in heads if REJECTED_TITLE.search(h[1])] or [h for h in heads if ALTERNATIVES_TITLE.search(h[1])]
    # "Why not X?" headings inside "Rejected Ideas" are items of that section, not sections of their own.
    spans = [(h[0], end_of(h[0], level[h[2]]), level[h[2]]) for h in sections]
    sections = [h for h, (s0, _, l0) in zip(sections, spans) if not any(s1 < s0 < e1 and l1 < l0 for s1, e1, l1 in spans)]
    items: List[Expected] = []
    for start, _, ch in sections:
        lvl = level[ch]
        end = len(lines)
        subs = []
        for idx, title, c in heads:
            if idx <= start:
                continue
            if level[c] <= lvl:
                end = idx
                break
            if level[c] == lvl + 1:
                subs.append((idx, title))
        if subs:
            bounds = [s[0] for s in subs] + [end]
            for (idx, title), stop in zip(subs, bounds[1:]):
                body = "\n".join(lines[idx + 2 : stop])
                items.append(Expected(strip_rst(title), strip_rst(body)))
        else:
            body = "\n".join(lines[start + 2 : end])
            for para in re.split(r"\n\s*\n", body):
                para = strip_rst(para)
                if len(para.split()) >= 8:
                    first = re.split(r"(?<=[.:])\s", para, maxsplit=1)[0]
                    items.append(Expected(first[:100], para))
    return items


# --- leakage guard ----------------------------------------------------------


def _shingles(text: str, n: int = 8) -> set:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {" ".join(words[i : i + n]) for i in range(len(words) - n + 1)}


def drop_leaked_posts(thread: Thread, pep_text: str, threshold: float = 0.3) -> Tuple[Thread, List[str]]:
    """Remove posts whose text is mostly copied from the PEP itself."""
    pep = _shingles(strip_rst(pep_text))
    kept, dropped = [], []
    for post in thread.posts:
        sh = _shingles(post.body)
        if len(sh) >= 40 and len(sh & pep) / len(sh) > threshold:
            dropped.append(post.id)
        else:
            kept.append(post)
    return Thread(thread.source, thread.title, thread.url, kept, thread.files), dropped


# --- matching ---------------------------------------------------------------

_STOP = set(
    "the a an of to and or in on for is are be this that it with as by not we would could should can "
    "which was were has have but if from at its their they there these those such also than then so "
    "pep proposal proposed approach idea".split()
)


def _terms(text: str) -> List[str]:
    out = []
    for w in re.findall(r"[a-z][a-z0-9_]+", text.lower()):
        if w in _STOP:
            continue
        for suffix in ("ing", "ed", "es", "s"):
            if len(w) > len(suffix) + 3 and w.endswith(suffix):
                w = w[: -len(suffix)]
                break
        out.append(w)
    return out


def _tfidf(docs: List[str]) -> List[Dict[str, float]]:
    counts = [Counter(_terms(d)) for d in docs]
    df: Counter = Counter()
    for c in counts:
        df.update(c.keys())
    n = len(docs)
    vecs = []
    for c in counts:
        v = {t: tf * math.log((1 + n) / (1 + df[t])) + tf * 0.1 for t, tf in c.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        vecs.append({t: x / norm for t, x in v.items()})
    return vecs


def _cos(a: Dict[str, float], b: Dict[str, float]) -> float:
    return sum(x * b.get(t, 0.0) for t, x in a.items())


def candidates(decisions: List[Decision]) -> List[Candidate]:
    """Rejected items that can be scored, one per name.

    An item counts only if one of its quotes was found in the thread. The same name is often
    rejected under several decisions; the copy with the longest reason is kept so the judge
    sees distinct ideas instead of repeats.
    """
    best: Dict[str, Candidate] = {}
    order: List[str] = []
    items = [(a.name, a.reason, d, a.verified) for d in decisions for a in d.alternatives]
    items += [(d.title, d.rationale or d.summary, d, d.verified) for d in decisions if d.status == "rejected"]
    for label, reason, d, verified in items:
        if not verified:
            continue
        key = re.sub(r"[^a-z0-9]", "", label.lower())
        cand = Candidate(label, reason, d.id, True, d.title)
        if key not in best:
            order.append(key)
            best[key] = cand
        elif len(reason) > len(best[key].reason):
            best[key] = cand
    return [best[k] for k in order]


JUDGE_SYSTEM = """You compare rejected ideas. You are given one rejected idea from a PEP and a \
numbered list of ideas that a tool extracted from the PEP's discussion, each with the decision it \
was found under and the reason the discussion gave. Decide which numbered item, if any, is the same \
idea (it may be worded differently). Answer 0 if none is. If you pick one, set pep_phrase to 3 to 12 \
words copied exactly from the PEP text (not from the extracted items) that name the same idea. Then say \
whether the item's reason agrees with the reason the PEP gives: "yes", "no", or "not stated" when the PEP \
gives no reason."""

JUDGE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "match": {"type": "integer"},
        "pep_phrase": {"type": "string"},
        "reason_agrees": {"type": "string", "enum": ["yes", "no", "not stated"]},
    },
    "required": ["match", "pep_phrase", "reason_agrees"],
}

_GENERIC = {"the", "and", "for", "that", "this", "with", "from", "into", "than", "then", "would", "could", "should",
         "which", "their", "there", "these", "those", "have", "been", "were", "will", "also", "only", "more", "less",
         # Words every rejected idea shares; they tie nothing to a particular idea.
         "considered", "proposed", "rejected", "idea", "ideas", "approach", "option", "options", "version",
         "earlier", "other", "name", "names", "instead", "because", "about", "using", "used", "make", "made"}


def _content_words(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9_]+", text.lower()) if len(w) > 3 and w not in _GENERIC}


def named_in_item(expected: Expected, cand: Candidate) -> bool:
    """The extracted idea's name appears word for word in the PEP's item (e.g. a list of rejected names)."""
    name = re.sub(r"[`\[\]]", "", cand.label).strip()
    return len(name) >= 4 and re.search(rf"(?<!\w){re.escape(name)}(?!\w)", f"{expected.title}\n{expected.text}", re.I) is not None


def anchored(phrase: str, expected: Expected, cand: Candidate) -> bool:
    """The judge's pick counts only if its PEP phrase is really in the PEP item and shares a word with the item it picked."""
    if not phrase.strip():
        return False
    score, _ = locate(phrase, f"{expected.title}\n{expected.text}")
    return score >= 0.85 and bool(_content_words(phrase) & _content_words(f"{cand.label} {cand.reason}"))


@dataclass
class ItemResult:
    expected: Expected
    candidate: Optional[Candidate]
    similarity: float
    matched: bool
    reason_agrees: Optional[bool]
    pep_phrase: str = ""
    picked: bool = False


def evaluate(
    expected: List[Expected], decisions: List[Decision], judge=None, threshold: float = 0.2, top_k: int = 10
) -> List[ItemResult]:
    cands = candidates(decisions)
    if not expected:
        return []
    exp_docs = [f"{e.title}\n{e.title}\n{e.text[:1200]}" for e in expected]
    cand_docs = [f"{c.label}\n{c.label}\n{c.reason}" for c in cands]
    vecs = _tfidf(exp_docs + cand_docs)
    ev, cv = vecs[: len(expected)], vecs[len(expected) :]
    results = []
    for e, v in zip(expected, ev):
        ranked = sorted(((_cos(v, c), i) for i, c in enumerate(cv)), reverse=True)[:top_k]
        best = cands[ranked[0][1]] if ranked else None
        sim = ranked[0][0] if ranked else 0.0
        if judge is None or not ranked:
            results.append(ItemResult(e, best, round(sim, 3), sim >= threshold, None))
            continue
        listing = "\n".join(
            f"{n}. {cands[i].label} (under: {cands[i].decision_title}): {cands[i].reason}" for n, (_, i) in enumerate(ranked, start=1)
        )
        user = f"PEP rejected idea: {e.title}\nPEP text: {e.text[:1500]}\n\nExtracted items:\n{listing}"
        verdict = judge.complete_json(JUDGE_SYSTEM, user, JUDGE_SCHEMA)
        pick = int(verdict.get("match", 0) or 0)
        if 1 <= pick <= len(ranked):
            sim_pick, idx = ranked[pick - 1]
            phrase = str(verdict.get("pep_phrase") or "")
            agrees = {"yes": True, "no": False}.get(str(verdict.get("reason_agrees")))
            # The model's pick needs support a reader can check: lexical similarity above the threshold,
            # the extracted name written in the PEP's item, or PEP words that are in the item and share
            # a specific word with the extracted idea.
            counted = sim_pick >= threshold or named_in_item(e, cands[idx]) or anchored(phrase, e, cands[idx])
            results.append(ItemResult(e, cands[idx], round(sim_pick, 3), counted, agrees, phrase, picked=True))
        else:
            results.append(ItemResult(e, best, round(sim, 3), False, None))
    return results


def render_report(number: int, title: str, thread: Thread, dropped: List[str], decisions: List[Decision], results: List[ItemResult], judged: bool) -> str:
    found = sum(r.matched for r in results)
    agree = sum(r.matched and r.reason_agrees is True for r in results)
    unstated = sum(r.matched and r.reason_agrees is None for r in results)
    cands = candidates(decisions)
    lines = [
        f"# PEP {number} evaluation: {title}",
        "",
        f"- Discussion: {thread.url} ({len(thread.posts)} posts used; posts copied from the PEP and removed: "
        f"{', '.join(dropped) if dropped else 'none'})",
        f"- Decisions extracted: {len(decisions)}; distinct rejected ideas extracted: {len(cands)}",
        "- Matching: "
        + (
            "the local model picks the same idea among the 10 most similar (TF-IDF); a pick counts only if its "
            "similarity is at least 0.2, the PEP item names it, or the PEP words the model quotes are in the "
            "item and share a specific word with it"
            if judged
            else "TF-IDF similarity only (threshold 0.2)"
        ),
        "",
        f"**Recovered {found} of {len(results)} rejected ideas from the PEP**"
        + (f"; the reason agrees with the PEP for {agree}, the PEP states no reason for {unstated}." if judged else "."),
        "",
        "| PEP rejected idea | Recovered as | Similarity | Found | Reason agrees |",
        "|---|---|---|---|---|",
    ]
    for r in results:
        got = r.candidate.label if (r.candidate and r.matched) else "-"
        if not r.matched:
            agree_cell = "-"
        else:
            agree_cell = {True: "yes", False: "no", None: "not stated" if judged else "-"}[r.reason_agrees]
        lines.append(f"| {r.expected.title} | {got} | {r.similarity:.2f} | {'yes' if r.matched else 'no'} | {agree_cell} |")
    lines += ["", "## Details", ""]
    for r in results:
        lines += [f"### {r.expected.title}", "", "PEP says: " + " ".join(r.expected.text.split())[:600], ""]
        if r.candidate and r.matched:
            lines.append(f"Recovered: **{r.candidate.label}**. {r.candidate.reason} (decision {r.candidate.decision_id})")
            if r.similarity >= 0.2:
                lines.append(f"Counted because: TF-IDF similarity {r.similarity:.2f}.")
            elif named_in_item(r.expected, r.candidate):
                lines.append(f"Counted because: the PEP item names `{r.candidate.label}`.")
            elif r.pep_phrase:
                lines.append(f'Counted because: the PEP words "{" ".join(r.pep_phrase.split())}" are in the item.')
            lines.append("")
        elif r.candidate and r.picked:
            if r.pep_phrase.strip():
                why = (f'the similarity is {r.similarity:.2f} and the PEP words it gave ("{" ".join(r.pep_phrase.split())[:120]}") '
                       "are not in this item or share nothing with the extracted idea")
            else:
                why = f"the similarity is {r.similarity:.2f} and it gave no PEP words to check"
            lines += [
                f"Not recovered. The local model picked **{r.candidate.label}**, but {why}, so it is not counted. "
                f"(decision {r.candidate.decision_id})",
                "",
            ]
        else:
            lines += ["Not recovered.", ""]
    return "\n".join(lines) + "\n"
