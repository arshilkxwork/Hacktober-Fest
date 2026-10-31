"""Evaluate extraction against a PEP: can we recover its rejected ideas from the discussion alone?

1. Fetch the PEP source and parse its "Rejected Ideas" (or similar) section into items.
2. Load the discussion thread named in the PEP's Discussions-To header.
3. Drop posts that are copies of the PEP text, so the system never sees the answer.
"""

from __future__ import annotations

import re
import urllib.request
from dataclasses import dataclass
from typing import List, Optional, Tuple

from .models import Thread

PEP_URL = "https://raw.githubusercontent.com/python/peps/main/peps/pep-{:04d}.rst"
REJECTED_TITLE = re.compile(r"rejected|abandoned|why not", re.I)
ALTERNATIVES_TITLE = re.compile(r"^alternatives?\b|alternatives? (considered|approaches|proposals)", re.I)
UNDERLINE = re.compile(r"^([=\-~^\"'`#*+:.])\1{2,}\s*$")


@dataclass
class Expected:
    title: str
    text: str


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
