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

    sections = [h for h in heads if REJECTED_TITLE.search(h[1])] or [h for h in heads if ALTERNATIVES_TITLE.search(h[1])]
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
    """Rejected items that can be scored. An item counts only if one of its quotes was found in the thread."""
    out = []
    for d in decisions:
        for alt in d.alternatives:
            if alt.verified:
                out.append(Candidate(alt.name, alt.reason, d.id, True))
        if d.status == "rejected" and d.verified:
            out.append(Candidate(d.title, d.rationale or d.summary, d.id, True))
    return out


JUDGE_SYSTEM = """You compare rejected ideas. You are given one rejected idea from a PEP and a \
numbered list of rejected ideas that a tool extracted from the PEP's discussion. Decide which \
numbered item, if any, is the same idea (it may be worded differently). Then decide whether the \
item's stated reason for rejection agrees with the PEP's reason. Answer 0 if none match."""

JUDGE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {"match": {"type": "integer"}, "reason_agrees": {"type": "boolean"}},
    "required": ["match", "reason_agrees"],
}


@dataclass
class ItemResult:
    expected: Expected
    candidate: Optional[Candidate]
    similarity: float
    matched: bool
    reason_agrees: Optional[bool]


def evaluate(
    expected: List[Expected], decisions: List[Decision], judge=None, threshold: float = 0.2, top_k: int = 5
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
        listing = "\n".join(f"{n}. {cands[i].label}: {cands[i].reason}" for n, (_, i) in enumerate(ranked, start=1))
        user = f"PEP rejected idea: {e.title}\nPEP text: {e.text[:1500]}\n\nExtracted items:\n{listing}"
        verdict = judge.complete_json(JUDGE_SYSTEM, user, JUDGE_SCHEMA)
        pick = int(verdict.get("match", 0) or 0)
        if 1 <= pick <= len(ranked):
            sim_pick, idx = ranked[pick - 1]
            agrees = bool(verdict.get("reason_agrees"))
            # A pick counts when its reason agrees with the PEP or it also clears the lexical threshold,
            # so the judge alone cannot turn an unrelated item into a recovered idea.
            results.append(ItemResult(e, cands[idx], round(sim_pick, 3), agrees or sim_pick >= threshold, agrees))
        else:
            results.append(ItemResult(e, best, round(sim, 3), False, None))
    return results


def render_report(number: int, title: str, thread: Thread, dropped: List[str], decisions: List[Decision], results: List[ItemResult], judged: bool) -> str:
    found = sum(r.matched for r in results)
    reasons = sum(bool(r.reason_agrees) for r in results)
    cands = candidates(decisions)
    lines = [
        f"# PEP {number} evaluation: {title}",
        "",
        f"- Discussion: {thread.url} ({len(thread.posts)} posts used; posts copied from the PEP and removed: "
        f"{', '.join(dropped) if dropped else 'none'})",
        f"- Decisions extracted: {len(decisions)}; rejected ideas extracted: {len(cands)}",
        f"- Matching: TF-IDF similarity{' + confirmation by the local model' if judged else ' only (threshold 0.2)'}",
        "",
        f"**Recovered {found} of {len(results)} rejected ideas from the PEP**"
        + (f"; reason agrees with the PEP for {reasons} of {len(results)}." if judged else "."),
        "",
        "| PEP rejected idea | Recovered as | Similarity | Found | Reason agrees |",
        "|---|---|---|---|---|",
    ]
    for r in results:
        got = r.candidate.label if (r.candidate and r.matched) else "-"
        agree = "-" if r.reason_agrees is None else ("yes" if r.reason_agrees else "no")
        lines.append(f"| {r.expected.title} | {got} | {r.similarity:.2f} | {'yes' if r.matched else 'no'} | {agree} |")
    lines += ["", "## Details", ""]
    for r in results:
        lines += [f"### {r.expected.title}", "", "PEP says: " + " ".join(r.expected.text.split())[:600], ""]
        if r.candidate and r.matched:
            lines += [f"Recovered: **{r.candidate.label}**. {r.candidate.reason} (decision {r.candidate.decision_id})", ""]
        elif r.candidate and r.reason_agrees is not None:
            lines += [
                f"Not recovered. The local model picked **{r.candidate.label}** (similarity {r.similarity:.2f}), "
                f"but its reason does not agree with the PEP and the similarity is below the threshold, so it is "
                f"not counted. (decision {r.candidate.decision_id})",
                "",
            ]
        else:
            lines += ["Not recovered.", ""]
    return "\n".join(lines) + "\n"
