"""Data types shared by every stage of the pipeline."""

from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Post:
    """One message in a discussion: an issue body, a comment, a forum post."""

    id: str
    author: str
    created_at: str
    body: str
    url: str
    platform: str = "local"
    display_name: str = ""
    # Review comments on a pull request point at a file and line.
    path: Optional[str] = None
    line: Optional[int] = None


@dataclass
class Thread:
    """A whole discussion, in chronological order."""

    source: str
    title: str
    url: str
    posts: List[Post]
    # Files changed by the pull request this thread belongs to, if any.
    files: List[str] = field(default_factory=list)

    def post(self, post_id: str) -> Optional[Post]:
        for p in self.posts:
            if p.id == post_id:
                return p
        return None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Thread":
        posts = [Post(**p) for p in data.get("posts", [])]
        return cls(
            source=data["source"],
            title=data.get("title", ""),
            url=data.get("url", ""),
            posts=posts,
            files=list(data.get("files", [])),
        )


@dataclass
class Evidence:
    """A verbatim quote from a post that supports a claim."""

    post_id: str
    quote: str
    url: str = ""
    author: str = ""
    verified: bool = False
    match_score: float = 0.0


@dataclass
class Alternative:
    """An approach that was considered and not taken."""

    name: str
    reason: str
    evidence: List[Evidence] = field(default_factory=list)

    @property
    def verified(self) -> bool:
        return any(e.verified for e in self.evidence)


@dataclass
class CodeLink:
    """Where in the code a decision applies."""

    path: str
    symbol: Optional[str] = None
    line: Optional[int] = None
    commit: Optional[str] = None
    how: str = ""
    moved_from: Optional[str] = None


@dataclass
class Decision:
    id: str
    title: str
    status: str
    summary: str
    rationale: str
    evidence: List[Evidence] = field(default_factory=list)
    alternatives: List[Alternative] = field(default_factory=list)
    code_refs: List[str] = field(default_factory=list)
    links: List[CodeLink] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)
    participants: List[str] = field(default_factory=list)
    confidence: float = 0.0

    @property
    def verified(self) -> bool:
        return any(e.verified for e in self.evidence) or any(a.verified for a in self.alternatives)

    def all_evidence(self) -> List[Evidence]:
        out = list(self.evidence)
        for alt in self.alternatives:
            out.extend(alt.evidence)
        return out

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Decision":
        return cls(
            id=data["id"],
            title=data["title"],
            status=data.get("status", "open"),
            summary=data.get("summary", ""),
            rationale=data.get("rationale", ""),
            evidence=[Evidence(**e) for e in data.get("evidence", [])],
            alternatives=[
                Alternative(
                    name=a["name"],
                    reason=a.get("reason", ""),
                    evidence=[Evidence(**e) for e in a.get("evidence", [])],
                )
                for a in data.get("alternatives", [])
            ],
            code_refs=list(data.get("code_refs", [])),
            links=[CodeLink(**link) for link in data.get("links", [])],
            sources=list(data.get("sources", [])),
            participants=list(data.get("participants", [])),
            confidence=float(data.get("confidence", 0.0)),
        )


def decision_id(source: str, title: str) -> str:
    digest = hashlib.sha1(f"{source}\n{title.strip().lower()}".encode("utf-8")).hexdigest()
    return "D-" + digest[:8]
