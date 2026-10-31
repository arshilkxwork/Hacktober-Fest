"""Persist decisions as JSON and export them as MADR-style decision records."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List

from . import __version__
from .models import Decision, Evidence


def load(path: str) -> List[Decision]:
    p = Path(path)
    if not p.exists():
        return []
    data = json.loads(p.read_text(encoding="utf-8"))
    try:
        return [Decision.from_dict(d) for d in data.get("decisions", [])]
    except (KeyError, TypeError) as exc:
        raise ValueError(f"{path} is not a DecisionTrail store: a decision is missing {exc}") from exc


def save(path: str, decisions: List[Decision], model: str) -> None:
    data = {
        "generator": f"decisiontrail {__version__}",
        "model": model,
        "decisions": [d.to_dict() for d in decisions],
    }
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def upsert(existing: List[Decision], new: List[Decision]) -> List[Decision]:
    """Replace decisions with the same id and keep the rest."""
    by_id: Dict[str, Decision] = {d.id: d for d in existing}
    for d in new:
        by_id[d.id] = d
    return list(by_id.values())


def _cite(ev: Evidence) -> str:
    mark = "verified" if ev.verified else "NOT FOUND in source, check manually"
    quote = ev.quote.replace("\n", " ")
    return f'> "{quote}"\n>\n> {ev.author}, [post {ev.post_id}]({ev.url}) ({mark})'


def to_markdown(d: Decision) -> str:
    lines = [f"# {d.title}", ""]
    lines.append(f"- Status: {d.status}")
    lines.append(f"- Decision ID: {d.id}")
    lines.append(f"- Sources: {', '.join(d.sources)}")
    if d.participants:
        lines.append(f"- Participants: {', '.join(d.participants)}")
    total = len(d.all_evidence())
    ok = sum(e.verified for e in d.all_evidence())
    lines.append(f"- Traceability: {ok} of {total} quotes found verbatim in the source")
    lines += ["", "## Decision", "", d.summary or "(no summary)", "", "## Why", "", d.rationale or "(no reason recorded)"]
    if d.evidence:
        lines += ["", "### Evidence", ""]
        for ev in d.evidence:
            lines += [_cite(ev), ""]
    if d.alternatives:
        lines += ["", "## Rejected alternatives"]
        for alt in d.alternatives:
            lines += ["", f"### {alt.name}", "", f"Rejected because: {alt.reason or '(no reason recorded)'}", ""]
            for ev in alt.evidence:
                lines += [_cite(ev), ""]
    if d.links:
        lines += ["", "## Code this decision applies to", ""]
        for link in d.links:
            where = link.path + (f":{link.line}" if link.line else "")
            sym = f" `{link.symbol}`" if link.symbol else ""
            lines.append(f"- `{where}`{sym} (found via {link.how})")
    elif d.code_refs:
        lines += ["", "## Code mentioned in the discussion", ""]
        lines += [f"- `{ref}`" for ref in d.code_refs]
    return "\n".join(lines).rstrip() + "\n"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "decision"


def export_markdown(decisions: List[Decision], out_dir: str) -> List[Path]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    written = []
    index = ["# Decision log", "", "| ID | Status | Decision | Rejected alternatives | Quotes verified |", "|---|---|---|---|---|"]
    for i, d in enumerate(decisions, start=1):
        name = f"{i:04d}-{slug(d.title)}.md"
        path = out / name
        path.write_text(to_markdown(d), encoding="utf-8")
        written.append(path)
        ev = d.all_evidence()
        index.append(
            f"| {d.id} | {d.status} | [{d.title}]({name}) | {len(d.alternatives)} | "
            f"{sum(e.verified for e in ev)}/{len(ev)} |"
        )
    (out / "README.md").write_text("\n".join(index) + "\n", encoding="utf-8")
    return written
