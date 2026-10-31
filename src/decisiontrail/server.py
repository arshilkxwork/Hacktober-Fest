"""HTTP API for the web app, and the static files of the built frontend.

Everything shown in the app comes from files on disk: the example outputs in
`examples/` and the user's own store, which analyses started from the app add
to. Files are re-read when they change, so a finished analysis shows up without
a restart. Analyses run one at a time on a background worker and use the same
local Ollama model as the CLI.
"""

from __future__ import annotations

import json
import mimetypes
import os
import queue
import re
import subprocess
import sys
import threading
import traceback
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from . import __version__, prcheck, sources, store
from .extract import TOPICS_PROMPT, chunk_posts, extract_thread
from .grounding import locate
from .linking import git, link_decision, tracked_files
from .llm import DEFAULT_HOST, DEFAULT_MODEL, OllamaBackend, normalize_host
from .models import CodeLink, Decision, Thread

ALLOWED_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}
# Discussion hosts the analyzer may fetch from; the CLI itself accepts any Discourse forum.
ANALYZE_HOSTS = {"github.com", "www.github.com", "discuss.python.org"}
MAX_BODY = 10 * 1024 * 1024
MAX_JOBS = 50
REPO_ROOT = Path(__file__).resolve().parents[2]

STAGES = [
    ("fetch", "Fetching discussion"),
    ("posts", "Extracting posts"),
    ("identify", "Identifying decisions"),
    ("alternatives", "Analyzing alternatives"),
    ("verify", "Verifying quotes"),
    ("link", "Linking decisions to code"),
    ("records", "Generating decision records"),
]

LANGUAGES = {
    ".py": "Python", ".pyi": "Python", ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript",
    ".mjs": "JavaScript", ".jsx": "JavaScript", ".c": "C", ".h": "C", ".cc": "C++", ".cpp": "C++",
    ".hpp": "C++", ".rs": "Rust", ".go": "Go", ".java": "Java", ".kt": "Kotlin", ".rb": "Ruby",
    ".php": "PHP", ".cs": "C#", ".swift": "Swift", ".sh": "Shell", ".rst": "reStructuredText", ".md": "Markdown",
    ".toml": "TOML", ".yml": "YAML", ".yaml": "YAML",
}

PR_URL = re.compile(r"^https?://github\.com/([\w.-]+)/([\w.-]+)/pull/(\d+)/?(?:[?#].*)?$")
REPO_URL = re.compile(r"^(?:https?://github\.com/)?([\w.-]+)/([\w.-]+?)(?:\.git)?/?$")

NO_FRONTEND = """<!doctype html>
<html><head><meta charset="utf-8"><title>DecisionTrail</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem">
<h1>DecisionTrail</h1>
<p>The API is running at <code>/api</code>, but the web app has not been built.</p>
<p>Run <code>npm install &amp;&amp; npm run build</code> in <code>web/</code> and restart
<code>decisiontrail serve</code>, or run <code>npm run dev</code> in <code>web/</code> and open the Vite dev server.</p>
</body></html>
"""


class ApiError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        m = re.match(r"(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}:\d{2}))?", text)
        if not m:
            return None
        dt = datetime.fromisoformat(m.group(1) + "T" + (m.group(2) or "00:00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _url_key(url: str) -> str:
    return url.strip().rstrip("/")


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def _http(url: str, accept: str, timeout: int = 20) -> bytes:
    headers = {"User-Agent": sources.USER_AGENT, "Accept": accept}
    token = os.environ.get("GITHUB_TOKEN")
    if token and urllib.parse.urlparse(url).hostname == "api.github.com":
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=timeout) as resp:
        return resp.read()


def check_ollama(host: str, model: str, timeout: float = 3) -> Dict[str, Any]:
    try:
        with urllib.request.urlopen(f"{normalize_host(host)}/api/tags", timeout=timeout) as resp:
            tags = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        reason = getattr(exc, "reason", exc)
        return {"reachable": False, "model_available": False, "error": f"Could not reach Ollama at {host}: {reason}"}
    names = set()
    for m in tags.get("models", []) or []:
        for key in ("name", "model"):
            if m.get(key):
                names.add(m[key])
                names.add(m[key][: -len(":latest")] if m[key].endswith(":latest") else m[key])
    if model not in names:
        return {"reachable": True, "model_available": False, "error": f"Model {model} is not pulled. Run `ollama pull {model}`."}
    return {"reachable": True, "model_available": True, "error": None}


def _strings(body: Dict[str, Any], *keys: str) -> None:
    for key in keys:
        if body.get(key) is not None and not isinstance(body[key], str):
            raise ApiError(400, f"{key} must be a string")


def fetch_pr_diff(owner: str, name: str, number: int) -> str:
    url = f"https://api.github.com/repos/{owner}/{name}/pulls/{number}"
    try:
        return _http(url, "application/vnd.github.v3.diff", timeout=60).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise ApiError(404, f"Pull request {owner}/{name}#{number} was not found, or the repository is private.")
        if exc.code in (403, 429):
            hint = "" if os.environ.get("GITHUB_TOKEN") else " Set GITHUB_TOKEN on the server to raise the limit."
            raise ApiError(502, f"GitHub refused the request (HTTP {exc.code}), most likely the API rate limit.{hint}")
        raise ApiError(502, f"GitHub returned HTTP {exc.code} for {owner}/{name}#{number}.")
    except (urllib.error.URLError, OSError) as exc:
        raise ApiError(502, f"Could not reach GitHub: {getattr(exc, 'reason', exc)}")


def fetch_repo_metadata(full_name: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(_http(f"https://api.github.com/repos/{full_name}", "application/vnd.github+json"))
    except Exception:
        return None


def is_git_checkout(path: str) -> bool:
    return Path(path).is_dir() and git(path, "rev-parse", "--is-inside-work-tree").strip() == "true"


def changed_files(diff: str) -> List[Dict[str, Any]]:
    """Per-file added/removed line counts, in the same order as prcheck.parse_diff."""
    out: List[Dict[str, Any]] = []
    for ch, block in zip(prcheck.parse_diff(diff), re.split(r"^(?=diff --git )", diff, flags=re.M)[1:]):
        added = removed = 0
        in_hunk = False
        for line in block.splitlines():
            if prcheck.HUNK_RE.match(line):
                in_hunk = True
            elif in_hunk and line.startswith("+"):
                added += 1
            elif in_hunk and line.startswith("-"):
                removed += 1
        path = ch.new_path or ch.old_path or ""
        old = ch.old_path if ch.old_path and ch.new_path and ch.old_path != ch.new_path else None
        out.append({"path": path, "old_path": old, "added": added, "removed": removed})
    return out


def language_of(links: List[CodeLink]) -> Optional[str]:
    if not links:
        return None
    return LANGUAGES.get(Path(links[0].path).suffix.lower())


class _Files:
    """JSON files cached by modification time."""

    def __init__(self) -> None:
        self._cache: Dict[str, Tuple[Tuple[int, int], Any]] = {}
        self._lock = threading.Lock()

    @staticmethod
    def stamp(path: Path) -> Optional[Tuple[int, int]]:
        try:
            st = path.stat()
        except OSError:
            return None
        return (st.st_mtime_ns, st.st_size)

    def read(self, path: Path) -> Any:
        stamp = self.stamp(path)
        if stamp is None:
            return None
        key = str(path)
        with self._lock:
            hit = self._cache.get(key)
            if hit and hit[0] == stamp:
                return hit[1]
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            # Caught mid-write: serve the previous version until the next read.
            if hit:
                return hit[1]
            raise
        with self._lock:
            self._cache[key] = (stamp, data)
        return data


class App:
    def __init__(
        self,
        store_path: str = ".decisiontrail/decisions.json",
        examples_dir: Optional[str] = None,
        web_dir: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        ollama_host: str = DEFAULT_HOST,
        num_ctx: int = 8192,
        start_worker: bool = True,
    ) -> None:
        self.store_path = Path(store_path)
        self.data_dir = self.store_path.parent
        self.threads_dir = self.data_dir / "threads"
        self.records_dir = self.data_dir / "records"
        self.jobs_path = self.data_dir / "jobs.json"
        self.repos_path = self.data_dir / "repos.json"
        self.examples_dir = Path(examples_dir) if examples_dir else None
        self.web_dir = Path(web_dir) if web_dir else None
        self.model = model
        self.ollama_host = ollama_host
        self.num_ctx = num_ctx
        self.make_backend: Callable[[], Any] = lambda: OllamaBackend(model=self.model, host=self.ollama_host, num_ctx=self.num_ctx)
        self.files = _Files()
        self._snap_lock = threading.Lock()
        self._snap: Optional[Tuple[Any, Dict[str, Any]]] = None
        self._commit_cache: Dict[Tuple[str, str], bool] = {}
        self._repos_lock = threading.Lock()
        self._jobs_lock = threading.RLock()
        self._store_lock = threading.Lock()
        self.jobs: List[Dict[str, Any]] = self._load_jobs()
        self._queue: "queue.Queue[Optional[str]]" = queue.Queue()
        self._worker: Optional[threading.Thread] = None
        if start_worker:
            self._worker = threading.Thread(target=self._work, name="decisiontrail-jobs", daemon=True)
            self._worker.start()

    def close(self) -> None:
        if self._worker is not None:
            self._queue.put(None)
            self._worker.join(timeout=5)

    # --- loading -------------------------------------------------------------

    def _example_dirs(self) -> List[Path]:
        if not self.examples_dir or not self.examples_dir.is_dir():
            return []
        return sorted(p for p in self.examples_dir.iterdir() if (p / "decisions.json").is_file())

    def _live_thread_files(self) -> List[Path]:
        return sorted(self.threads_dir.glob("*.json")) if self.threads_dir.is_dir() else []

    def _signature(self) -> Tuple:
        paths: List[Path] = []
        for d in self._example_dirs():
            paths += [d / "decisions.json", d / "thread.json"]
        paths += [self.store_path, self.repos_path] + self._live_thread_files()
        return tuple((str(p), self.files.stamp(p)) for p in paths)

    def _decisions_file(self, path: Path) -> List[Decision]:
        data = self.files.read(path) or {}
        return [Decision.from_dict(d) for d in data.get("decisions", [])]

    def _thread_file(self, path: Path) -> Optional[Thread]:
        data = self.files.read(path)
        return Thread.from_dict(data) if data else None

    def snapshot(self) -> Dict[str, Any]:
        sig = self._signature()
        with self._snap_lock:
            if self._snap and self._snap[0] == sig:
                return self._snap[1]
        snap = self._build()
        with self._snap_lock:
            self._snap = (sig, snap)
        return snap

    def _build(self) -> Dict[str, Any]:
        groups = []  # (dataset id, kind, decisions, own thread or None)
        for d in self._example_dirs():
            thread_path = d / "thread.json"
            groups.append((d.name, "example", self._decisions_file(d / "decisions.json"), self._thread_file(thread_path) if thread_path.is_file() else None))

        threads_by_url: Dict[str, Thread] = {}
        thread_entries: List[Dict[str, Any]] = []
        thread_objs: Dict[str, Thread] = {}
        for ds_id, _, _, thread in groups:
            if thread is not None and _url_key(thread.url) not in threads_by_url:
                threads_by_url[_url_key(thread.url)] = thread
        live_threads: List[Tuple[str, Thread]] = []
        for path in self._live_thread_files():
            try:
                thread = self._thread_file(path)
            except (ValueError, KeyError, TypeError):
                continue
            if thread is not None and _url_key(thread.url) not in threads_by_url:
                threads_by_url[_url_key(thread.url)] = thread
                live_threads.append((f"analysis-{path.stem}", thread))

        live = self._decisions_file(self.store_path) if self.store_path.is_file() else None
        if live is not None:
            groups.append(("analyses", "analysis", live, None))

        def thread_for(d: Decision) -> Optional[Thread]:
            for src in d.sources:
                t = threads_by_url.get(_url_key(src))
                if t is not None:
                    return t
            return None

        datasets: List[Dict[str, Any]] = []
        for ds_id, kind, decs, own in groups:
            matched = own or next((t for t in (thread_for(d) for d in decs) if t is not None), None)
            if kind == "analysis":
                label = "Live analyses"
                one = live_threads[0][1] if len(live_threads) == 1 else None
                url, title = (one.url, one.title) if one else (None, None)
                posts = sum(len(t.posts) for _, t in live_threads)
                has_thread = bool(live_threads)
            else:
                label = own.title if own else (f"{ds_id}: {matched.title}" if matched else ds_id)
                url = own.url if own else (matched.url if matched else next((d.sources[0] for d in decs if d.sources), None))
                title = matched.title if matched else None
                posts = len(own.posts) if own else 0
                has_thread = own is not None
            datasets.append({
                "id": ds_id, "label": label, "kind": kind, "decisions": len(decs), "discussion_url": url,
                "discussion_title": title, "posts": posts, "has_thread": has_thread,
            })
            if own is not None:
                thread_entries.append(dict(datasets[-1]))
                thread_objs[ds_id] = own
        for tid, thread in live_threads:
            key = _url_key(thread.url)
            count = sum(1 for d in (live or []) if any(_url_key(s) == key for s in d.sources))
            thread_entries.append({
                "id": tid, "label": thread.title or tid, "kind": "analysis", "decisions": count,
                "discussion_url": thread.url, "discussion_title": thread.title, "posts": len(thread.posts), "has_thread": True,
            })
            thread_objs[tid] = thread
        for entry in thread_entries:
            times = [(parse_time(p.created_at), p.created_at) for p in thread_objs[entry["id"]].posts]
            times = [t for t in times if t[0]]
            entry["first_post_at"] = min(times)[1] if times else None
            entry["last_post_at"] = max(times)[1] if times else None

        # Merge by id: keep the copy with the most links, list every dataset it appears in.
        merged: Dict[str, Dict[str, Any]] = {}
        for ds_id, kind, decs, _ in groups:
            for d in decs:
                entry = merged.get(d.id)
                if entry is None:
                    merged[d.id] = {"decision": d, "origin": kind, "datasets": [ds_id]}
                    continue
                if ds_id not in entry["datasets"]:
                    entry["datasets"].append(ds_id)
                if len(d.links) > len(entry["decision"].links):
                    entry["decision"], entry["origin"] = d, kind

        repos = self._load_repos()
        decisions: List[Dict[str, Any]] = []
        objects: Dict[str, Decision] = {}
        threads_of: Dict[str, Optional[Thread]] = {}
        for did, entry in merged.items():
            d = entry["decision"]
            thread = thread_for(d)
            objects[did] = d
            threads_of[did] = thread
            decisions.append(self._payload(d, entry["origin"], entry["datasets"], thread, repos))
        far_past = datetime.min.replace(tzinfo=timezone.utc)
        decisions.sort(key=lambda x: parse_time(x["date"]) or far_past, reverse=True)
        per_dataset = {ds_id: decs for ds_id, _, decs, _ in groups}
        return {
            "datasets": datasets, "thread_entries": thread_entries, "thread_objs": thread_objs,
            "decisions": decisions, "by_id": {d["id"]: d for d in decisions}, "objects": objects,
            "threads_of": threads_of, "per_dataset": per_dataset, "repos": repos, "timelines": {},
        }

    def _payload(self, d: Decision, origin: str, datasets: List[str], thread: Optional[Thread], repos: List[Dict[str, Any]]) -> Dict[str, Any]:
        data = d.to_dict()
        data["verified"] = d.verified
        for alt_data, alt in zip(data["alternatives"], d.alternatives):
            alt_data["verified"] = alt.verified
        for link_data, link in zip(data["links"], d.links):
            link_data["repo"] = self._repo_for(link, repos)
        times = []
        if thread is not None:
            for ev in d.all_evidence():
                post = thread.post(ev.post_id) if ev.verified else None
                t = parse_time(post.created_at) if post else None
                if t:
                    times.append((t, post.created_at))
        data.update({
            "origin": origin,
            "datasets": list(datasets),
            "discussion_url": thread.url if thread else (d.sources[0] if d.sources else None),
            "discussion_title": thread.title if thread else None,
            "date": max(times)[1] if times else None,
            "first_date": min(times)[1] if times else None,
            "language": language_of(d.links),
        })
        return data

    def _repo_for(self, link: CodeLink, repos: List[Dict[str, Any]]) -> Optional[str]:
        if not link.commit:
            return None
        for repo in repos:
            path = repo.get("local_path")
            if not path:
                continue
            key = (path, link.commit)
            if key not in self._commit_cache:
                res = subprocess.run(["git", "-C", path, "cat-file", "-e", f"{link.commit}^{{commit}}"], capture_output=True)
                self._commit_cache[key] = res.returncode == 0
            if self._commit_cache[key]:
                return repo["full_name"]
        return None

    # --- read endpoints -----------------------------------------------------

    def health(self) -> Dict[str, Any]:
        return {
            "version": __version__,
            "model": self.model,
            "ollama_host": normalize_host(self.ollama_host),
            "ollama": check_ollama(self.ollama_host, self.model, timeout=2),
            "store_path": str(self.store_path),
            "examples_dir": str(self.examples_dir) if self.examples_dir else None,
            "github_token": bool(os.environ.get("GITHUB_TOKEN")),
        }

    def datasets(self) -> Dict[str, Any]:
        return {"datasets": self.snapshot()["datasets"]}

    def decisions(self) -> Dict[str, Any]:
        return {"decisions": self.snapshot()["decisions"]}

    def decision(self, did: str) -> Dict[str, Any]:
        snap = self.snapshot()
        data = snap["by_id"].get(did)
        if data is None:
            raise ApiError(404, f"No decision with id {did}")
        thread = snap["threads_of"][did]
        timeline = snap["timelines"].get(did)
        if timeline is None:
            timeline = snap["timelines"][did] = build_timeline(snap["objects"][did], thread)
        info = {"title": thread.title, "url": thread.url, "posts": len(thread.posts)} if thread else None
        return {"decision": data, "timeline": timeline, "thread": info}

    def threads(self) -> Dict[str, Any]:
        return {"threads": self.snapshot()["thread_entries"]}

    def thread(self, ds_id: str) -> Dict[str, Any]:
        thread = self.snapshot()["thread_objs"].get(ds_id)
        if thread is None:
            raise ApiError(404, f"No discussion for dataset {ds_id}")
        posts = [
            {"id": p.id, "author": p.author, "display_name": p.display_name, "created_at": p.created_at, "url": p.url,
             "excerpt": p.body[:280]}
            for p in thread.posts
        ]
        return {"thread": {"source": thread.source, "title": thread.title, "url": thread.url, "posts": posts}}

    def stats(self) -> Dict[str, Any]:
        snap = self.snapshot()
        decs = snap["decisions"]
        objs = snap["objects"]
        counts = {s: sum(1 for d in decs if d["status"] == s) for s in ("accepted", "rejected", "open")}
        evidence = [e for d in objs.values() for e in d.all_evidence()]
        entries = snap["thread_entries"]
        totals = {
            "decisions": len(decs), **counts,
            "rejected_alternatives": sum(len(d.alternatives) for d in objs.values()),
            "verified_quotes": sum(e.verified for e in evidence),
            "total_quotes": len(evidence),
            "connected_repositories": len(snap["repos"]),
            "discussions": len(entries),
            "posts": sum(e["posts"] for e in entries),
        }

        months: Dict[str, Dict[str, int]] = {}
        for d in decs:
            t = parse_time(d["date"])
            if t:
                row = months.setdefault(t.strftime("%Y-%m"), {"accepted": 0, "rejected": 0, "open": 0})
                row[d["status"]] = row.get(d["status"], 0) + 1
        over_time = [{"period": p, **months.get(p, {"accepted": 0, "rejected": 0, "open": 0})} for p in _month_range(months)]

        weeks: Dict[date, int] = {}
        for entry in entries:
            for p in snap["thread_objs"][entry["id"]].posts:
                t = parse_time(p.created_at)
                if t:
                    monday = t.date() - timedelta(days=t.weekday())
                    weeks[monday] = weeks.get(monday, 0) + 1
        activity = []
        if weeks:
            day, last = min(weeks), max(weeks)
            while day <= last:
                activity.append({"week": day.isoformat(), "posts": weeks.get(day, 0)})
                day += timedelta(days=7)

        labels = {ds["id"]: ds["label"] for ds in snap["datasets"]}
        by_discussion = [
            {"dataset": ds_id, "label": labels.get(ds_id, ds_id), "decisions": len(ds_decs),
             "alternatives": sum(len(d.alternatives) for d in ds_decs)}
            for ds_id, ds_decs in snap["per_dataset"].items()
        ]
        return {
            "totals": totals,
            "decisions_over_time": over_time,
            "status_breakdown": [{"status": s, "count": counts[s]} for s in ("accepted", "rejected", "open")],
            "by_discussion": by_discussion,
            "discussion_activity": activity,
        }

    # --- check-pr -----------------------------------------------------------

    def check_pr(self, body: Dict[str, Any]) -> Dict[str, Any]:
        _strings(body, "pr_url", "diff", "repo_path", "base", "head")
        pr_url = (body.get("pr_url") or "").strip()
        diff = body.get("diff") or ""
        repo_path = (body.get("repo_path") or "").strip() or None
        base = (body.get("base") or "").strip() or None
        if repo_path and not is_git_checkout(repo_path):
            raise ApiError(400, f"{repo_path} is not a git checkout")
        if pr_url:
            m = PR_URL.match(pr_url)
            if not m:
                raise ApiError(400, "pr_url must look like https://github.com/owner/repo/pull/123")
            owner, name, number = m.group(1), m.group(2), int(m.group(3))
            diff = fetch_pr_diff(owner, name, number)
            source = {"kind": "github", "label": f"{owner}/{name}#{number}", "url": f"https://github.com/{owner}/{name}/pull/{number}"}
        elif diff.strip():
            source = {"kind": "diff", "label": "Pasted diff", "url": None}
        elif repo_path and base:
            head = (body.get("head") or "").strip() or "HEAD"
            diff = prcheck.diff_between(repo_path, base, head)
            source = {"kind": "git", "label": f"{base}...{head} in {repo_path}", "url": None}
        else:
            raise ApiError(400, "Give a pr_url, a diff, or a repo_path with a base ref")
        changes = prcheck.parse_diff(diff)
        if not changes:
            raise ApiError(400, "The diff has no file changes")
        snap = self.snapshot()
        decisions = [snap["objects"][d["id"]] for d in snap["decisions"]]
        matches = prcheck.match_decisions(decisions, changes, repo=repo_path)
        return {
            "source": source,
            "changed_files": changed_files(diff),
            "matches": [
                {"decision": snap["by_id"][m.decision.id], "score": m.score, "reasons": m.reasons,
                 "conflicts": prcheck.find_conflicts(m, diff)}
                for m in matches
            ],
            "report_markdown": prcheck.render_report(matches),
        }

    # --- repositories -------------------------------------------------------

    def _load_repos(self) -> List[Dict[str, Any]]:
        data = self.files.read(self.repos_path) if self.repos_path.is_file() else None
        return list((data or {}).get("repos", []))

    def repos(self) -> Dict[str, Any]:
        snap = self.snapshot()
        out = []
        for repo in snap["repos"]:
            linked = sum(1 for d in snap["decisions"] if any(link["repo"] == repo["full_name"] for link in d["links"]))
            out.append({**repo, "linked_decisions": linked})
        return {"repos": out}

    def add_repo(self, body: Dict[str, Any]) -> Dict[str, Any]:
        spec = (body.get("repo") or "").strip()
        m = REPO_URL.match(spec)
        if not m:
            raise ApiError(400, "repo must be owner/name or a https://github.com/owner/name URL")
        local_path = (body.get("local_path") or "").strip() or None
        if local_path:
            local_path = str(Path(local_path).expanduser().resolve())
            if not is_git_checkout(local_path):
                raise ApiError(400, f"{local_path} is not a git checkout")
        full_name = f"{m.group(1)}/{m.group(2)}"
        meta = fetch_repo_metadata(full_name) or {}
        full_name = meta.get("full_name") or full_name
        repo = {
            "id": full_name,
            "full_name": full_name,
            "url": meta.get("html_url") or f"https://github.com/{full_name}",
            "description": meta.get("description"),
            "stars": meta.get("stargazers_count"),
            "language": meta.get("language"),
            "default_branch": meta.get("default_branch"),
            "local_path": local_path,
            "added_at": _now(),
        }
        with self._repos_lock:
            repos = [r for r in self._load_repos() if r["full_name"].lower() != full_name.lower()]
            repos.append(repo)
            _write_json(self.repos_path, {"repos": repos})
        return next(r for r in self.repos()["repos"] if r["full_name"] == full_name)

    def delete_repo(self, full_name: str) -> None:
        with self._repos_lock:
            repos = self._load_repos()
            keep = [r for r in repos if r["full_name"].lower() != full_name.lower()]
            if len(keep) == len(repos):
                raise ApiError(404, f"Repository {full_name} is not connected")
            _write_json(self.repos_path, {"repos": keep})

    # --- analysis jobs ------------------------------------------------------

    def _load_jobs(self) -> List[Dict[str, Any]]:
        try:
            jobs = json.loads(self.jobs_path.read_text(encoding="utf-8")).get("jobs", [])
        except (OSError, ValueError):
            return []
        for job in jobs:
            if job.get("status") in ("queued", "running"):
                job.update(status="error", error="The server stopped before this analysis finished.", finished_at=job.get("finished_at") or _now())
                for st in job.get("stages", []):
                    if st["status"] == "running":
                        st["status"] = "error"
        return jobs

    def _save_jobs(self) -> None:
        with self._jobs_lock:
            del self.jobs[MAX_JOBS:]
            _write_json(self.jobs_path, {"jobs": self.jobs})

    def _job(self, job_id: str) -> Dict[str, Any]:
        with self._jobs_lock:
            for job in self.jobs:
                if job["id"] == job_id:
                    return job
        raise ApiError(404, f"No job with id {job_id}")

    def list_jobs(self) -> Dict[str, Any]:
        with self._jobs_lock:
            return {"jobs": json.loads(json.dumps(self.jobs))}

    def get_job(self, job_id: str) -> Dict[str, Any]:
        with self._jobs_lock:
            return {"job": json.loads(json.dumps(self._job(job_id)))}

    def analyze(self, body: Dict[str, Any]) -> Dict[str, Any]:
        _strings(body, "url", "repo_path")
        url = (body.get("url") or "").strip()
        if not url:
            raise ApiError(400, "url is required")
        if not (re.match(r"^[\w.-]+/[\w.-]+#\d+$", url) or urllib.parse.urlsplit(url).hostname in ANALYZE_HOSTS):
            raise ApiError(400, "Give a GitHub issue or pull request URL, owner/repo#123, or a discuss.python.org topic URL")
        repo_path = (body.get("repo_path") or "").strip() or None
        if repo_path:
            repo_path = str(Path(repo_path).expanduser())
            if not Path(repo_path).is_dir():
                raise ApiError(400, f"{repo_path} does not exist")
        job = {
            "id": uuid.uuid4().hex[:12], "url": url, "repo_path": repo_path, "status": "queued",
            "stages": [{"key": k, "label": label, "status": "pending", "detail": None} for k, label in STAGES],
            "log": [], "created_at": _now(), "finished_at": None, "error": None, "result": None,
        }
        with self._jobs_lock:
            self.jobs.insert(0, job)
            self._save_jobs()
        self._queue.put(job["id"])
        return self.get_job(job["id"])

    def _work(self) -> None:
        while True:
            job_id = self._queue.get()
            if job_id is None:
                return
            try:
                job = self._job(job_id)
            except ApiError:
                continue
            try:
                self._run(job)
            except Exception as exc:
                with self._jobs_lock:
                    for st in job["stages"]:
                        if st["status"] == "running":
                            st["status"] = "error"
                    job.update(status="error", error=str(exc) or exc.__class__.__name__, finished_at=_now())
                    job["log"].append(f"error: {job['error']}")
            finally:
                self._save_jobs()

    def _stage(self, job: Dict[str, Any], key: str, status: str, detail: Optional[str] = None) -> None:
        with self._jobs_lock:
            st = next(s for s in job["stages"] if s["key"] == key)
            st["status"] = status
            if detail is not None:
                st["detail"] = detail
            self._save_jobs()

    def _log(self, job: Dict[str, Any], line: str) -> None:
        with self._jobs_lock:
            job["log"].append(line)

    def _run(self, job: Dict[str, Any]) -> None:
        with self._jobs_lock:
            job["status"] = "running"
        self._log(job, f"Checking Ollama at {normalize_host(self.ollama_host)}")
        ollama = check_ollama(self.ollama_host, self.model)
        if ollama["error"]:
            raise RuntimeError(ollama["error"])

        self._stage(job, "fetch", "running", job["url"])
        thread = sources.load_thread(job["url"])
        self._stage(job, "fetch", "done", thread.title or thread.url)
        self._log(job, f"Loaded {len(thread.posts)} posts: {thread.title}")

        self._stage(job, "posts", "running")
        if not thread.posts:
            raise RuntimeError("The discussion has no posts")
        excerpts = len(chunk_posts(thread.posts))
        self._stage(job, "posts", "done", f"{len(thread.posts)} posts in {excerpts} excerpt(s)")

        progress = _Progress(self, job)
        backend = _StageBackend(self.make_backend(), progress)
        decisions = extract_thread(thread, backend, progress=progress)
        alts = sum(len(d.alternatives) for d in decisions)
        self._stage(job, "identify", "done", f"{progress.topics} question(s) in {progress.total} excerpt(s)")
        self._stage(job, "alternatives", "done", f"{len(decisions)} decision(s), {alts} rejected alternative(s)")

        evidence = [e for d in decisions for e in d.all_evidence()]
        ok = sum(e.verified for e in evidence)
        self._stage(job, "verify", "done", f"{ok} of {len(evidence)} quotes found in their posts")

        kept = [d for d in decisions if d.verified]
        dropped = len(decisions) - len(kept)
        repo = job.get("repo_path")
        if repo and is_git_checkout(repo):
            self._stage(job, "link", "running", repo)
            files = tracked_files(repo)
            for d in kept:
                d.links = link_decision(d, thread, repo, files)
            linked = sum(1 for d in kept if d.links)
            self._stage(job, "link", "done", f"{sum(len(d.links) for d in kept)} link(s) for {linked} decision(s)")
        else:
            reason = f"{repo} is not a git checkout" if repo else "No repository path was given"
            self._stage(job, "link", "skipped", reason)

        self._stage(job, "records", "running")
        with self._store_lock:
            merged = store.upsert(store.load(str(self.store_path)), kept)
            store.save(str(self.store_path), merged, backend.model)
            self.threads_dir.mkdir(parents=True, exist_ok=True)
            sources.save_thread(thread, str(self.threads_dir / f"{store.slug(thread.source)}.json"))
            store.export_markdown(merged, str(self.records_dir))
        note = f", {dropped} dropped with no verified quote" if dropped else ""
        self._stage(job, "records", "done", f"{len(kept)} decision(s) saved{note}")
        self._log(job, f"Wrote {len(merged)} decisions to {self.store_path}")

        kept_ev = [e for d in kept for e in d.all_evidence()]
        with self._jobs_lock:
            job.update(status="done", finished_at=_now(), result={
                "decision_ids": [d.id for d in kept],
                "decisions": len(kept),
                "verified_quotes": sum(e.verified for e in kept_ev),
                "total_quotes": len(kept_ev),
                "alternatives": sum(len(d.alternatives) for d in kept),
                "discussion_title": thread.title,
            })


class _Progress:
    """Receives extract_thread's progress lines and remembers which excerpt is being read."""

    def __init__(self, app: App, job: Dict[str, Any]) -> None:
        self.app, self.job = app, job
        self.excerpt, self.total, self.topic, self.topics = 0, 0, 0, 0

    def __call__(self, line: str) -> None:
        self.app._log(self.job, line)
        m = re.search(r"excerpt (\d+)/(\d+)", line)
        if m:
            self.excerpt, self.total, self.topic = int(m.group(1)), int(m.group(2)), 0


class _StageBackend:
    """Passes calls to the real backend and moves the job's stages along as it goes."""

    def __init__(self, inner: Any, progress: _Progress) -> None:
        self.inner, self.progress = inner, progress
        self.model = inner.model

    def complete_json(self, system: str, user: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        p = self.progress
        where = f"excerpt {p.excerpt}/{p.total}"
        if system == TOPICS_PROMPT:
            p.app._stage(p.job, "identify", "running", where)
            result = self.inner.complete_json(system, user, schema)
            p.topics += len(result.get("topics", []) or [])
            return result
        p.topic += 1
        p.app._stage(p.job, "alternatives", "running", f"{where}, topic {p.topic}")
        return self.inner.complete_json(system, user, schema)


def _month_range(months: Dict[str, Any]) -> List[str]:
    if not months:
        return []
    y, m = map(int, min(months).split("-"))
    end = max(months)
    out = []
    while f"{y:04d}-{m:02d}" <= end:
        out.append(f"{y:04d}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def _words(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9_]+", text.lower()) if len(w) > 2}


def _argues_reason(reason: str, body: str, quotes: List[str]) -> bool:
    """Whether a post states the reason an alternative was turned down."""
    if not reason.strip():
        return False
    if locate(reason, body)[0] >= 0.7:
        return True
    rw = _words(reason)
    qw = _words(" ".join(quotes))
    return bool(rw) and len(rw & qw) / len(rw) >= 0.5


def build_timeline(d: Decision, thread: Optional[Thread]) -> List[Dict[str, Any]]:
    posts = {p.id: p for p in thread.posts} if thread else {}
    first = thread.posts[0].id if thread and thread.posts else None
    events: Dict[str, Dict[str, Any]] = {}

    def event(post_id: str, ev_url: str = "", ev_author: str = "") -> Dict[str, Any]:
        if post_id not in events:
            post = posts.get(post_id)
            events[post_id] = {
                "post_id": post_id,
                "created_at": post.created_at if post else None,
                "author": (post.author if post else ev_author) or ev_author,
                "url": (post.url if post else ev_url) or ev_url,
                "quotes": [], "_alts": [], "_objects": [], "_decision": False,
            }
        return events[post_id]

    def add_quote(e: Dict[str, Any], text: str, verified: bool, about: Optional[str]) -> None:
        q = {"text": text, "verified": verified, "about": about}
        if q not in e["quotes"]:
            e["quotes"].append(q)

    if first is not None:
        event(first)
    for ev in d.evidence:
        e = event(ev.post_id, ev.url, ev.author)
        e["_decision"] = True
        add_quote(e, ev.quote, ev.verified, None)
    for alt in d.alternatives:
        by_post: Dict[str, List[str]] = {}
        for ev in alt.evidence:
            e = event(ev.post_id, ev.url, ev.author)
            add_quote(e, ev.quote, ev.verified, alt.name)
            by_post.setdefault(ev.post_id, []).append(ev.quote)
        for post_id, quotes in by_post.items():
            post = posts.get(post_id)
            objects = _argues_reason(alt.reason, post.body if post else "", quotes)
            target = events[post_id]["_objects" if objects else "_alts"]
            if alt.name not in target:
                target.append(alt.name)

    def order(e: Dict[str, Any]) -> Tuple:
        t = parse_time(e["created_at"])
        num = int(e["post_id"]) if e["post_id"].isdigit() else 0
        return (t is None, t or datetime.min.replace(tzinfo=timezone.utc), num)

    ordered = sorted(events.values(), key=order)
    decision_posts = [e for e in ordered if e["_decision"]]
    verified_posts = [e for e in decision_posts if any(q["verified"] and q["about"] is None for q in e["quotes"])]
    latest = (verified_posts or decision_posts or [None])[-1]
    out = []
    for e in ordered:
        if e["post_id"] == first:
            kind, label = "question", "Question raised"
        elif e is latest:
            kind, label = "decision", f"Decision: {d.status}"
        elif e["_objects"]:
            kind, label = "objection", "Objection to " + ", ".join(e["_objects"])
        elif e["_alts"]:
            kind, label = "proposal", "Alternative proposed: " + ", ".join(e["_alts"])
        else:
            kind, label = "discussion", "Discussion"
        out.append({
            "post_id": e["post_id"], "created_at": e["created_at"], "author": e["author"], "url": e["url"],
            "kind": kind, "label": label, "quotes": e["quotes"],
        })
    return out


# --- HTTP --------------------------------------------------------------------


ROUTES: List[Tuple[str, "re.Pattern[str]", str]] = [
    ("GET", re.compile(r"^/api/health$"), "health"),
    ("GET", re.compile(r"^/api/datasets$"), "datasets"),
    ("GET", re.compile(r"^/api/decisions$"), "decisions"),
    ("GET", re.compile(r"^/api/decisions/([^/]+)$"), "decision"),
    ("GET", re.compile(r"^/api/threads$"), "threads"),
    ("GET", re.compile(r"^/api/threads/([^/]+)$"), "thread"),
    ("GET", re.compile(r"^/api/stats$"), "stats"),
    ("GET", re.compile(r"^/api/jobs$"), "list_jobs"),
    ("GET", re.compile(r"^/api/jobs/([^/]+)$"), "get_job"),
    ("GET", re.compile(r"^/api/repos$"), "repos"),
    ("POST", re.compile(r"^/api/analyze$"), "analyze"),
    ("POST", re.compile(r"^/api/check-pr$"), "check_pr"),
    ("POST", re.compile(r"^/api/repos$"), "add_repo"),
    ("DELETE", re.compile(r"^/api/repos/([^/]+)/([^/]+)$"), "delete_repo"),
]


class Handler(BaseHTTPRequestHandler):
    server_version = f"decisiontrail/{__version__}"

    def log_message(self, fmt: str, *args: Any) -> None:
        if getattr(self.server, "verbose", False):
            sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def _cors(self) -> None:
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Vary", "Origin")

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status: int, data: Any) -> None:
        self._send(status, json.dumps(data, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def _body(self) -> Dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            raise ApiError(400, "Bad Content-Length")
        if length > MAX_BODY:
            raise ApiError(413, "Request body is too large")
        raw = self.rfile.read(length) if length else b""
        if not raw:
            return {}
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            raise ApiError(400, "Request body must be JSON")
        if not isinstance(data, dict):
            raise ApiError(400, "Request body must be a JSON object")
        return data

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        self._dispatch("GET")

    def do_HEAD(self) -> None:
        self._dispatch("GET")

    def do_POST(self) -> None:
        self._dispatch("POST")

    def do_DELETE(self) -> None:
        self._dispatch("DELETE")

    def _dispatch(self, method: str) -> None:
        path = urllib.parse.urlsplit(self.path).path
        if not path.startswith("/api/") and path != "/api":
            if method == "GET":
                return self._static(path)
            return self._json(405, {"error": "Method not allowed"})
        app = self.server.app  # type: ignore[attr-defined]
        try:
            host = (self.headers.get("Host") or "").rsplit(":", 1)[0].strip("[]").lower()
            if host not in LOCAL_HOSTS | {str(self.server.server_address[0]).lower()}:
                raise ApiError(403, "This API only answers requests addressed to this machine")
            if method == "POST" and not (self.headers.get("Content-Type") or "").startswith("application/json"):
                raise ApiError(415, "Send the request body as application/json")
            for verb, pattern, name in ROUTES:
                m = pattern.match(path)
                if not m or verb != method:
                    continue
                args = [urllib.parse.unquote(a) for a in m.groups()]
                if name == "analyze":
                    return self._json(202, app.analyze(self._body()))
                if name == "check_pr":
                    return self._json(200, app.check_pr(self._body()))
                if name == "add_repo":
                    return self._json(201, {"repo": app.add_repo(self._body())})
                if name == "delete_repo":
                    app.delete_repo("/".join(args))
                    return self._json(200, {"ok": True})
                return self._json(200, getattr(app, name)(*args))
            if any(p.match(path) for _, p, _ in ROUTES):
                raise ApiError(405, "Method not allowed")
            raise ApiError(404, f"No API endpoint at {path}")
        except ApiError as exc:
            self._json(exc.status, {"error": exc.message})
        except (ValueError, OSError) as exc:
            self._json(400, {"error": str(exc)})
        except Exception as exc:
            traceback.print_exc()
            self._json(500, {"error": f"{exc.__class__.__name__}: {exc}"})

    def _static(self, path: str) -> None:
        web = self.server.app.web_dir  # type: ignore[attr-defined]
        if web is None or not (web / "index.html").is_file():
            return self._send(200, NO_FRONTEND.encode("utf-8"), "text/html; charset=utf-8")
        root = web.resolve()
        target = (root / urllib.parse.unquote(path).lstrip("/")).resolve()
        if not target.is_relative_to(root) or not target.is_file():
            target = root / "index.html"
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json", "image/svg+xml"):
            ctype += "; charset=utf-8"
        self._send(200, target.read_bytes(), ctype)


def make_server(app: App, host: str = "127.0.0.1", port: int = 8765, verbose: bool = False) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    server.app = app  # type: ignore[attr-defined]
    server.verbose = verbose  # type: ignore[attr-defined]
    return server


def default_dir(*parts: str) -> Optional[str]:
    """`<cwd>/<parts>` if it exists, else the same path in the source checkout, else None."""
    for base in (Path.cwd(), REPO_ROOT):
        p = base.joinpath(*parts)
        if p.is_dir():
            return str(p)
    return None
