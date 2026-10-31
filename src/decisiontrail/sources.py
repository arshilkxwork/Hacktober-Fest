"""Load public discussions: GitHub issues and pull requests, Discourse forums, local JSON."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable, Dict, List, Tuple

from .models import Post, Thread

USER_AGENT = "decisiontrail/0.1"

GITHUB_URL = re.compile(r"^https?://github\.com/([^/]+)/([^/]+)/(?:issues|pull)/(\d+)")
GITHUB_SHORT = re.compile(r"^(?:github:)?([\w.-]+)/([\w.-]+)#(\d+)$")
DISCOURSE_URL = re.compile(r"^https?://([^/]+)/t/(?:[^/]+/)?(\d+)(?:/\d+)?/?$")

Fetcher = Callable[[str], Any]


def http_get_json(url: str) -> Any:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token and urllib.parse.urlparse(url).hostname == "api.github.com":
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        host = urllib.parse.urlparse(url).hostname
        if host == "api.github.com" and exc.code in (403, 429):
            hint = "" if token else " Set GITHUB_TOKEN (in the environment or .env) to raise the limit."
            raise ValueError(f"GitHub refused {url} (HTTP {exc.code}), most likely its API rate limit.{hint}") from exc
        if exc.code == 404:
            raise ValueError(f"{url} was not found (HTTP 404). Check the link, or whether the repository is private.") from exc
        raise


def load_thread(spec: str, fetch: Fetcher = http_get_json) -> Thread:
    """Load a thread from a local JSON file, a GitHub issue/PR, or a Discourse topic."""
    path = Path(spec)
    if path.suffix == ".json" and path.exists():
        return Thread.from_dict(json.loads(path.read_text(encoding="utf-8")))
    m = GITHUB_URL.match(spec) or GITHUB_SHORT.match(spec)
    if m:
        return load_github(m.group(1), m.group(2), int(m.group(3)), fetch)
    m = DISCOURSE_URL.match(spec)
    if m:
        return load_discourse(m.group(1), int(m.group(2)), fetch)
    raise ValueError(f"Don't know how to load {spec!r}: expected a .json file, a GitHub issue/PR, or a Discourse topic URL")


# --- GitHub -----------------------------------------------------------------


def _paged(fetch: Fetcher, url: str, limit: int = 20) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for page in range(1, limit + 1):
        sep = "&" if "?" in url else "?"
        batch = fetch(f"{url}{sep}per_page=100&page={page}")
        if not batch:
            break
        out.extend(batch)
        if len(batch) < 100:
            break
    return out


def _github_name(fetch: Fetcher, login: str) -> str:
    """The profile name, so the same person can be matched on Discourse. Empty if not set or unreadable."""
    try:
        return (fetch(f"https://api.github.com/users/{login}") or {}).get("name") or ""
    except Exception:
        return ""


def load_github(owner: str, repo: str, number: int, fetch: Fetcher = http_get_json) -> Thread:
    api = f"https://api.github.com/repos/{owner}/{repo}"
    issue = fetch(f"{api}/issues/{number}")
    is_pr = "pull_request" in issue

    raw: List[Dict[str, Any]] = [
        {
            "author": issue["user"]["login"],
            "created_at": issue["created_at"],
            "body": issue.get("body") or "",
            "url": issue["html_url"],
        }
    ]
    for c in _paged(fetch, f"{api}/issues/{number}/comments"):
        raw.append(
            {
                "author": c["user"]["login"],
                "created_at": c["created_at"],
                "body": c.get("body") or "",
                "url": c["html_url"],
            }
        )

    files: List[str] = []
    if is_pr:
        for c in _paged(fetch, f"{api}/pulls/{number}/comments"):
            raw.append(
                {
                    "author": c["user"]["login"],
                    "created_at": c["created_at"],
                    "body": c.get("body") or "",
                    "url": c["html_url"],
                    "path": c.get("path"),
                    "line": c.get("line") or c.get("original_line"),
                }
            )
        for r in _paged(fetch, f"{api}/pulls/{number}/reviews"):
            if r.get("body"):
                raw.append(
                    {
                        "author": r["user"]["login"],
                        "created_at": r.get("submitted_at") or issue["created_at"],
                        "body": r["body"],
                        "url": r["html_url"],
                    }
                )
        files = [f["filename"] for f in _paged(fetch, f"{api}/pulls/{number}/files")]

    raw.sort(key=lambda r: r["created_at"])
    # One extra request per participant: only worth spending when a token raises the rate limit.
    logins = {r["author"] for r in raw}
    names = {login: _github_name(fetch, login) for login in logins} if os.environ.get("GITHUB_TOKEN") else {}
    posts = [
        Post(
            id=str(i),
            author=r["author"],
            created_at=r["created_at"],
            body=r["body"],
            url=r["url"],
            platform="github",
            display_name=names.get(r["author"], ""),
            path=r.get("path"),
            line=r.get("line"),
        )
        for i, r in enumerate(raw, start=1)
    ]
    return Thread(
        source=f"github:{owner}/{repo}#{number}",
        title=issue.get("title", ""),
        url=issue["html_url"],
        posts=posts,
        files=files,
    )


# --- Discourse (discuss.python.org and others) -------------------------------


class _HTMLToText(HTMLParser):
    """Turn Discourse's rendered HTML into readable text that keeps quotes and code."""

    BLOCK = {"p", "div", "li", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "aside"}
    VOID = {"img", "br", "hr", "input", "meta", "link", "source", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: List[Tuple[str, bool]] = []
        self.quote_depth = 0
        self.aside_depth = 0
        self.skip_depth = 0
        self.in_pre = False

    def handle_starttag(self, tag: str, attrs: List[Any]) -> None:
        cls = dict(attrs).get("class") or ""
        if self.skip_depth and tag in self.VOID:
            return
        # Discourse puts "alice said:" in a div.title inside aside.quote; the quoted text follows.
        if self.skip_depth or (tag == "div" and "title" in cls.split() and self.aside_depth):
            self.skip_depth += 1
            return
        if tag == "aside" and "quote" in cls.split():
            self.aside_depth += 1
        if tag == "blockquote":
            self.quote_depth += 1
            self._add("\n")
        elif tag == "br":
            self._add("\n")
        elif tag == "pre":
            self.in_pre = True
            self._add("\n```\n")
        elif tag == "code" and not self.in_pre:
            self._add("`")
        elif tag == "li":
            self._add("\n- ")
        elif tag in self.BLOCK:
            self._add("\n")

    def handle_endtag(self, tag: str) -> None:
        if self.skip_depth:
            self.skip_depth -= 1
            return
        if tag == "aside" and self.aside_depth:
            self.aside_depth -= 1
        if tag == "blockquote":
            self.quote_depth = max(0, self.quote_depth - 1)
            self._add("\n")
        elif tag == "pre":
            self.in_pre = False
            self._add("\n```\n")
        elif tag == "code" and not self.in_pre:
            self._add("`")
        elif tag in self.BLOCK:
            self._add("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        self._add(data, quoted=bool(self.quote_depth) and not self.in_pre)

    def _add(self, text: str, quoted: bool = False) -> None:
        self.parts.append((text, quoted))

    def text(self) -> str:
        # Mark a whole line as quoted once, at its start, even when inline code splits the
        # quoted text into several pieces.
        lines: List[Tuple[str, bool]] = []
        line, line_quoted = "", False
        for chunk, quoted in self.parts:
            pieces = chunk.split("\n")
            for i, piece in enumerate(pieces):
                if i:
                    lines.append((line, line_quoted))
                    line, line_quoted = "", False
                line += piece
                line_quoted = line_quoted or (quoted and bool(piece.strip()))
        lines.append((line, line_quoted))
        out = "\n".join("> " + text if quoted else text for text, quoted in lines)
        out = re.sub(r"[ \t]+\n", "\n", out)
        out = re.sub(r"\n{3,}", "\n\n", out)
        return out.strip()


def html_to_text(html: str) -> str:
    parser = _HTMLToText()
    parser.feed(html or "")
    parser.close()
    return parser.text()


def load_discourse(host: str, topic_id: int, fetch: Fetcher = http_get_json) -> Thread:
    base = f"https://{host}"
    topic = fetch(f"{base}/t/{topic_id}.json")
    slug = topic.get("slug", "")
    stream = topic.get("post_stream", {})
    posts_raw: Dict[int, Dict[str, Any]] = {p["id"]: p for p in stream.get("posts", [])}
    missing = [pid for pid in stream.get("stream", []) if pid not in posts_raw]
    for i in range(0, len(missing), 20):
        batch = missing[i : i + 20]
        query = "&".join(f"post_ids[]={pid}" for pid in batch)
        data = fetch(f"{base}/t/{topic_id}/posts.json?{query}")
        for p in data.get("post_stream", {}).get("posts", []):
            posts_raw[p["id"]] = p

    ordered = sorted(posts_raw.values(), key=lambda p: p["post_number"])
    posts = [
        Post(
            id=str(p["post_number"]),
            author=p.get("username", ""),
            display_name=p.get("name") or "",
            created_at=p.get("created_at", ""),
            body=html_to_text(p.get("cooked", "")),
            url=f"{base}/t/{slug}/{topic_id}/{p['post_number']}",
            platform=f"discourse:{host}",
        )
        for p in ordered
        # Post type 1 is a regular post; 2/3/4 are moderator actions and whispers.
        if p.get("post_type", 1) == 1
    ]
    return Thread(
        source=f"discourse:{host}/t/{topic_id}",
        title=topic.get("title", ""),
        url=f"{base}/t/{slug}/{topic_id}",
        posts=posts,
    )


def save_thread(thread: Thread, path: str) -> None:
    Path(path).write_text(json.dumps(thread.to_dict(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
