"""Load public discussions: GitHub issues and pull requests, local JSON."""

from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable, Dict, List

from .models import Post, Thread

USER_AGENT = "decisiontrail/0.1"

GITHUB_URL = re.compile(r"^https?://github\.com/([^/]+)/([^/]+)/(?:issues|pull)/(\d+)")
GITHUB_SHORT = re.compile(r"^(?:github:)?([\w.-]+)/([\w.-]+)#(\d+)$")

Fetcher = Callable[[str], Any]


def http_get_json(url: str) -> Any:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token and urllib.parse.urlparse(url).hostname == "api.github.com":
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_thread(spec: str, fetch: Fetcher = http_get_json) -> Thread:
    """Load a thread from a local JSON file or a GitHub issue/PR."""
    path = Path(spec)
    if path.suffix == ".json" and path.exists():
        return Thread.from_dict(json.loads(path.read_text(encoding="utf-8")))
    m = GITHUB_URL.match(spec) or GITHUB_SHORT.match(spec)
    if m:
        return load_github(m.group(1), m.group(2), int(m.group(3)), fetch)
    raise ValueError(f"Don't know how to load {spec!r}: expected a .json file or a GitHub issue/PR")


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
    posts = [
        Post(
            id=str(i),
            author=r["author"],
            created_at=r["created_at"],
            body=r["body"],
            url=r["url"],
            platform="github",
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


def save_thread(thread: Thread, path: str) -> None:
    Path(path).write_text(json.dumps(thread.to_dict(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
