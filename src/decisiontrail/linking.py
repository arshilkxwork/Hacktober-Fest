"""Link decisions to the source code they are about, and keep those links alive.

A link is found from three kinds of signal, strongest first:
- a review comment on a pull request that the decision cites (it names a file and line)
- a file path or code identifier named in the discussion, resolved against the repo
- the files the pull request changed (weakest: the whole PR was about them)

Each link stores the commit it was made at. When a file is later renamed or
moved, `resolve` follows the rename with `git diff -M` from that commit, and
falls back to finding the linked symbol again if history is not available
(for example in a shallow clone without the original commit).
"""

from __future__ import annotations

import re
import subprocess
from typing import Iterable, List, Optional, Sequence, Set, Tuple

from .models import CodeLink, Decision, Thread

PATH_RE = re.compile(
    r"(?<![\w/.-])((?:[\w.-]+/)*[\w-]+\.(?:py|pyi|c|h|cc|cpp|hpp|rs|go|js|mjs|ts|tsx|jsx|java|kt|rb|php|cs|"
    r"swift|toml|cfg|ini|yml|yaml|rst|md|sh|gram|asdl))\b"
)
BACKTICK_RE = re.compile(r"`([^`\n]{2,80})`")
CALL_RE = re.compile(r"\b([A-Za-z_][\w.]*)\(\)")
SNAKE_RE = re.compile(r"\b([a-z][a-z0-9]*_[a-z0-9_]+)\b")
CAMEL_RE = re.compile(r"\b([A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*)\b")
IDENT_RE = re.compile(r"^[A-Za-z_][\w.]*$")

COMMON = set(
    "None True False self cls args kwargs return import from class def print len str int list dict "
    "set type object value name data file path self.assert test tests".split()
)

DEF_TEMPLATE = (
    r"^\s*(?:async\s+def|def|class|fn|pub\s+fn|func|function|struct|enum|interface|trait|type)\s+{name}\b"
    r"|^{name}\s*(?::[^=]*)?=[^=]"
    r"|^[A-Za-z_][\w\s\*]*\b{name}\s*\([^;]*$"
)


def git(repo: str, *args: str) -> str:
    result = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    if result.returncode != 0:
        return ""
    return result.stdout


def head_commit(repo: str) -> str:
    return git(repo, "rev-parse", "HEAD").strip()


def tracked_files(repo: str) -> List[str]:
    return [f for f in git(repo, "ls-files").splitlines() if f]


def refs_from_text(text: str) -> Tuple[List[str], List[str]]:
    """Pull file paths and code identifiers out of free text."""
    paths = PATH_RE.findall(text)
    idents: List[str] = []
    for chunk in BACKTICK_RE.findall(text):
        chunk = chunk.strip().rstrip("()")
        if IDENT_RE.match(chunk):
            idents.append(chunk)
        elif PATH_RE.fullmatch(chunk):
            paths.append(chunk)
    idents += CALL_RE.findall(text) + SNAKE_RE.findall(text) + CAMEL_RE.findall(text)
    return _uniq(paths), _uniq(i for i in idents if _useful(i))


def _useful(ident: str) -> bool:
    last = ident.split(".")[-1]
    return len(last) >= 3 and last not in COMMON and not PATH_RE.fullmatch(ident)


def _uniq(items: Iterable[str]) -> List[str]:
    out: List[str] = []
    for item in items:
        if item not in out:
            out.append(item)
    return out


def resolve_path(ref: str, files: Sequence[str]) -> List[str]:
    ref = ref.lstrip("./")
    if ref in files:
        return [ref]
    matches = [f for f in files if f.endswith("/" + ref)]
    return matches if len(matches) <= 3 else []


def find_definitions(repo: str, ident: str, limit: int = 3) -> List[Tuple[str, int]]:
    parts = ident.split(".")
    name = parts[-1]
    hints = [p.lower() for p in parts[:-1]]
    out = git(repo, "grep", "-n", "-I", "-w", "-F", "-e", name)
    pattern = re.compile(DEF_TEMPLATE.format(name=re.escape(name)))
    found = []
    for line in out.splitlines():
        try:
            path, lineno, content = line.split(":", 2)
        except ValueError:
            continue
        if pattern.search(content):
            score = sum(h in path.lower() for h in hints)
            # Prefer real source over tests and docs when nothing else distinguishes them.
            score -= 0.5 * bool(re.search(r"(^|/)(tests?|docs?)/", path))
            found.append((score, path, int(lineno)))
    found.sort(key=lambda t: (-t[0], t[1], t[2]))
    return [(p, n) for _, p, n in found[:limit]]


def link_decision(decision: Decision, thread: Thread, repo: str, files: Optional[List[str]] = None, max_links: int = 8) -> List[CodeLink]:
    files = files if files is not None else tracked_files(repo)
    commit = head_commit(repo) or None
    links: List[CodeLink] = []
    seen: Set[Tuple[str, Optional[str]]] = set()

    def add(path: str, symbol: Optional[str], line: Optional[int], how: str) -> None:
        if (path, symbol) in seen or len(links) >= max_links:
            return
        seen.add((path, symbol))
        links.append(CodeLink(path=path, symbol=symbol, line=line, commit=commit, how=how))

    # 1. Review comments the decision cites.
    for ev in decision.all_evidence():
        post = thread.post(ev.post_id)
        if ev.verified and post is not None and post.path:
            for path in resolve_path(post.path, files):
                add(path, None, post.line, "review comment")

    # 2. Paths and identifiers named in the decision or its quotes.
    text = "\n".join(
        [decision.title, decision.summary, decision.rationale]
        + [e.quote for e in decision.all_evidence()]
        + [a.name + " " + a.reason for a in decision.alternatives]
    )
    paths, idents = refs_from_text(text)
    for ref in decision.code_refs:
        ref = ref.strip("`").rstrip("()")
        if PATH_RE.fullmatch(ref):
            paths.append(ref)
        elif IDENT_RE.match(ref) and _useful(ref):
            idents.append(ref)
    for ref in _uniq(paths):
        for path in resolve_path(ref, files):
            add(path, None, None, "path named in discussion")
    for ident in _uniq(idents):
        for path, line in find_definitions(repo, ident):
            add(path, ident.split(".")[-1], line, "identifier named in discussion")

    # 3. Files the pull request changed.
    for ref in thread.files:
        for path in resolve_path(ref, files):
            add(path, None, None, "changed in the discussed PR")
    return links


def resolve(link: CodeLink, repo: str, files: Optional[Sequence[str]] = None) -> Optional[CodeLink]:
    """Return where the linked code lives now, following renames, or None if it is gone."""
    files = files if files is not None else tracked_files(repo)
    if link.path in files:
        return link
    if link.commit:
        for row in git(repo, "diff", "--name-status", "-M", link.commit, "HEAD").splitlines():
            cols = row.split("\t")
            if cols[0].startswith("R") and len(cols) == 3 and cols[1] == link.path:
                return CodeLink(
                    path=cols[2], symbol=link.symbol, line=None, commit=link.commit, how=link.how, moved_from=link.path
                )
    if link.symbol:
        defs = find_definitions(repo, link.symbol, limit=1)
        if defs:
            path, line = defs[0]
            return CodeLink(path=path, symbol=link.symbol, line=line, commit=link.commit, how=link.how, moved_from=link.path)
    return None
