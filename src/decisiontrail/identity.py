"""Recognise the same contributor across GitHub and Discourse.

Matching rules, strongest first:
1. An explicit alias file maps platform accounts to one person.
2. The same handle on two platforms (case and punctuation ignored).
3. The same full display name (two or more words) on two platforms.

Anything weaker is left unmerged: wrongly merging two people is worse than
listing one person twice.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, Optional


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


class IdentityResolver:
    def __init__(self, aliases: Optional[Dict[str, str]] = None) -> None:
        # "platform:handle" or "handle" -> canonical person name
        self.aliases = {k.lower(): v for k, v in (aliases or {}).items()}
        self.by_handle: Dict[str, str] = {}
        self.by_name: Dict[str, str] = {}

    @classmethod
    def from_file(cls, path: Optional[str]) -> "IdentityResolver":
        if not path:
            return cls()
        return cls(json.loads(Path(path).read_text(encoding="utf-8")))

    def canonical(self, platform: str, handle: str, display_name: str = "") -> str:
        for key in (f"{platform}:{handle}".lower(), handle.lower()):
            if key in self.aliases:
                return self.aliases[key]
        h = _norm(handle)
        if h in self.by_handle:
            return self.by_handle[h]
        n = _norm(display_name) if len(display_name.split()) >= 2 else ""
        if n and n in self.by_name:
            person = self.by_name[n]
        else:
            person = handle
        self.by_handle.setdefault(h, person)
        if n:
            self.by_name.setdefault(n, person)
        return person
