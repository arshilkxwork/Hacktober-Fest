"""When a pull request changes code, find the past decisions about that code.

The output is a Markdown report meant for the CI job summary. It is never
posted as a comment on anyone's repository.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from .linking import git, refs_from_text, resolve, tracked_files
from .models import Decision

HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$")


@dataclass
class FileChange:
    old_path: Optional[str]
    new_path: Optional[str]
    old_ranges: List[Tuple[int, int]] = field(default_factory=list)
    text: List[str] = field(default_factory=list)

    @property
    def paths(self) -> List[str]:
        return [p for p in (self.old_path, self.new_path) if p]


def parse_diff(diff: str) -> List[FileChange]:
    changes: List[FileChange] = []
    current: Optional[FileChange] = None
    for line in diff.splitlines():
        if line.startswith("diff --git "):
            current = FileChange(None, None)
            changes.append(current)
        elif current is None:
            continue
        elif line.startswith("--- "):
            current.old_path = None if line[4:].strip() == "/dev/null" else line[4:].strip()[2:]
        elif line.startswith("+++ "):
            current.new_path = None if line[4:].strip() == "/dev/null" else line[4:].strip()[2:]
        elif line.startswith("rename from "):
            current.old_path = line[len("rename from ") :]
        elif line.startswith("rename to "):
            current.new_path = line[len("rename to ") :]
        else:
            m = HUNK_RE.match(line)
            if m:
                start, length = int(m.group(1)), int(m.group(2) or 1)
                current.old_ranges.append((start, start + max(length, 1) - 1))
                current.text.append(m.group(5))
            elif line and line[0] in "+- ":
                # Context lines count too: they show which function the change sits in.
                current.text.append(line[1:])
    return changes


def diff_between(repo: str, base: str, head: str = "HEAD") -> str:
    return git(repo, "diff", "-M", f"{base}...{head}")


@dataclass
class Match:
    decision: Decision
    score: int
    reasons: List[str]


def match_decisions(decisions: Sequence[Decision], changes: Sequence[FileChange], repo: Optional[str] = None) -> List[Match]:
    files = tracked_files(repo) if repo else None
    matches: List[Match] = []
    for d in decisions:
        score, reasons = 0, []
        for link in d.links:
            current = resolve(link, repo, files) if repo else link
            if current is None:
                continue
            for ch in changes:
                if current.path not in ch.paths and link.path not in ch.paths:
                    continue
                changed = "\n".join(ch.text)
                moved = f" (moved from {current.moved_from})" if current.moved_from else ""
                if current.symbol and re.search(rf"\b{re.escape(current.symbol)}\b", changed):
                    score += 3
                    reasons.append(f"changes `{current.symbol}` in `{current.path}`{moved}")
                elif current.line and any(lo - 10 <= current.line <= hi + 10 for lo, hi in ch.old_ranges):
                    score += 3
                    reasons.append(f"changes `{current.path}` near line {current.line}{moved}")
                else:
                    score += 1
                    reasons.append(f"touches `{current.path}`{moved}")
        if not d.links:
            # No repo was linked; fall back to identifiers named in the decision.
            changed = "\n".join(t for ch in changes for t in ch.text)
            for ref in d.code_refs:
                _, idents = refs_from_text(f"`{ref}`")
                for ident in idents:
                    name = ident.split(".")[-1]
                    if re.search(rf"\b{re.escape(name)}\b", changed):
                        score += 2
                        reasons.append(f"changed lines mention `{name}`")
        if score:
            matches.append(Match(d, score, list(dict.fromkeys(reasons))))
    matches.sort(key=lambda m: -m.score)
    return matches


def render_report(matches: Sequence[Match], limit: int = 10) -> str:
    if not matches:
        return "## DecisionTrail\n\nNo recorded decisions cover the code this change touches.\n"
    lines = [
        "## DecisionTrail",
        "",
        f"This change touches code covered by {len(matches)} earlier decision(s). "
        "Read them before going ahead; every point links to the discussion it came from.",
    ]
    for m in matches[:limit]:
        d = m.decision
        lines += ["", f"### {d.title} ({d.status.upper()})", ""]
        lines.append("Why this came up: " + "; ".join(m.reasons) + ".")
        lines += ["", f"**Decision:** {d.summary}", "", f"**Reason:** {d.rationale}"]
        if d.alternatives:
            lines += ["", "**Already tried or rejected:**"]
            for alt in d.alternatives:
                cite = next((e for e in alt.evidence if e.verified), None)
                src = f" ([post {cite.post_id}]({cite.url}))" if cite else " (no verified quote)"
                lines.append(f"- {alt.name}: {alt.reason}{src}")
        verified = [e for e in d.evidence if e.verified]
        if verified:
            ev = verified[0]
            lines += ["", f'> "{ev.quote}"', f"> {ev.author}, [post {ev.post_id}]({ev.url})"]
        lines += ["", f"Sources: {', '.join(d.sources)}"]
    if len(matches) > limit:
        lines += ["", f"...and {len(matches) - limit} more."]
    return "\n".join(lines) + "\n"


def added_lines(diff: str) -> List[str]:
    """The lines a unified diff adds, without the leading "+"."""
    out: List[str] = []
    in_hunk = False
    for line in diff.splitlines():
        if line.startswith("diff --git "):
            in_hunk = False
        elif HUNK_RE.match(line):
            in_hunk = True
        elif in_hunk and line.startswith("+"):
            out.append(line[1:])
    return out


def find_conflicts(match: Match, changes: str) -> List[Dict[str, str]]:
    """Rejected alternatives of a matched decision that the diff (`changes`, unified diff text) adds back by name."""
    added = added_lines(changes)
    conflicts: List[Dict[str, str]] = []
    for alt in match.decision.alternatives:
        # "TypeNarrow[er]" should also catch "TypeNarrower".
        names = {alt.name.strip("` "), re.sub(r"[`\[\]]", "", alt.name).strip()}
        patterns = [re.compile(rf"(?<!\w){re.escape(n)}(?!\w)", re.I) for n in names if len(n) >= 4]
        line = next((ln for ln in added if any(p.search(ln) for p in patterns)), None)
        if line is not None:
            conflicts.append({"alternative": alt.name, "reason": alt.reason, "line": line.strip()})
    return conflicts
