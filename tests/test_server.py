import json
import socket
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from decisiontrail import server
from test_extract import RAW, FakeBackend

EXAMPLES = Path(__file__).resolve().parents[1] / "examples"
# What the API should report, computed from the example files themselves.
THREADS = sorted(p.parent.name for p in EXAMPLES.glob("*/thread.json"))
POSTS = sum(len(json.loads(p.read_text())["posts"]) for p in EXAMPLES.glob("*/thread.json"))
DECISION_IDS = {d["id"] for p in EXAMPLES.glob("*/decisions.json") for d in json.loads(p.read_text())["decisions"]}


def _closed_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture
def api(tmp_path):
    app = server.App(
        store_path=str(tmp_path / "dt" / "decisions.json"),
        examples_dir=str(EXAMPLES),
        web_dir=str(tmp_path / "no-web"),
        ollama_host=f"http://127.0.0.1:{_closed_port()}",
    )
    httpd = server.make_server(app, "127.0.0.1", 0)
    threading.Thread(target=httpd.serve_forever, kwargs={"poll_interval": 0.02}, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"

    def call(method, path, body=None, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(base + path, data=data, method=method, headers={"Content-Type": "application/json", **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = resp.read()
                ctype = resp.headers.get("Content-Type", "")
                return resp.status, (json.loads(raw) if "json" in ctype else raw.decode()), resp.headers
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read()), exc.headers

    call.app = app
    call.tmp = tmp_path
    yield call
    httpd.shutdown()
    httpd.server_close()
    app.close()


def test_health_reports_unreachable_ollama(api):
    status, body, _ = api("GET", "/api/health")
    assert status == 200
    assert body["ollama"]["reachable"] is False and body["ollama"]["error"]
    assert body["model"] == "qwen2.5:7b-instruct"
    assert body["examples_dir"] == str(EXAMPLES)


def test_datasets_and_merged_decisions(api):
    datasets = {d["id"]: d for d in api("GET", "/api/datasets")[1]["datasets"]}
    assert {"pep-709", "pep-742", "pr-check"} <= set(datasets)
    assert datasets["pep-742"]["has_thread"] and datasets["pep-742"]["posts"] == 33
    assert not datasets["pr-check"]["has_thread"]

    decisions = api("GET", "/api/decisions")[1]["decisions"]
    ids = [d["id"] for d in decisions]
    assert len(ids) == len(set(ids)) == len(DECISION_IDS)
    adopt = next(d for d in decisions if d["id"] == "D-6cc1785a")
    # pep-742 and pr-check share ids; the pr-check copy carries the code links.
    assert adopt["datasets"] == ["pep-742", "pr-check"]
    assert len(adopt["links"]) == 2 and adopt["language"] == "Python"
    assert adopt["links"][0]["repo"] is None
    assert adopt["discussion_title"] == "PEP 742: Narrowing types with TypeIs"
    assert adopt["first_date"] <= adopt["date"] and adopt["verified"] is True
    assert all("verified" in a for a in adopt["alternatives"])
    dates = [d["date"] for d in decisions if d["date"]]
    assert dates == sorted(dates, reverse=True)


def test_decision_detail_timeline(api):
    status, body, _ = api("GET", "/api/decisions/D-c88ad407")
    assert status == 200
    assert body["thread"]["posts"] == 33
    timeline = body["timeline"]
    assert timeline[0]["kind"] == "question" and timeline[0]["post_id"] == "1"
    assert [e["kind"] for e in timeline].count("decision") == 1
    assert timeline[-1]["kind"] == "decision" and timeline[-1]["label"] == "Decision: accepted"
    assert any(e["kind"] == "objection" and "TypeNarrower" in e["label"] for e in timeline)
    times = [e["created_at"] for e in timeline]
    assert times == sorted(times)
    d = body["decision"]
    cited = {e["post_id"] for e in d["evidence"] + [e for a in d["alternatives"] for e in a["evidence"]]}
    assert {e["post_id"] for e in timeline} <= cited | {"1"}
    assert api("GET", "/api/decisions/D-missing")[0] == 404


def test_stats_are_consistent(api):
    stats = api("GET", "/api/stats")[1]
    t = stats["totals"]
    assert t["decisions"] == len(DECISION_IDS) == t["accepted"] + t["rejected"] + t["open"]
    assert sum(r["count"] for r in stats["status_breakdown"]) == t["decisions"]
    assert t["verified_quotes"] <= t["total_quotes"]
    assert t["discussions"] == len(THREADS) and t["posts"] == POSTS
    assert sum(w["posts"] for w in stats["discussion_activity"]) == t["posts"]
    assert all(time.strptime(w["week"], "%Y-%m-%d").tm_wday == 0 for w in stats["discussion_activity"])
    dated = sum(1 for d in api("GET", "/api/decisions")[1]["decisions"] if d["date"])
    assert sum(r["accepted"] + r["rejected"] + r["open"] for r in stats["decisions_over_time"]) == dated
    assert {r["dataset"] for r in stats["by_discussion"]} == set(THREADS) | {"pr-check"}


def test_threads(api):
    threads = api("GET", "/api/threads")[1]["threads"]
    assert [t["id"] for t in threads] == THREADS
    assert next(t for t in threads if t["id"] == "pep-742")["first_post_at"] == "2024-02-11T04:39:19.272Z"
    thread = api("GET", "/api/threads/pep-742")[1]["thread"]
    assert len(thread["posts"]) == 33 and len(thread["posts"][0]["excerpt"]) <= 280
    assert api("GET", "/api/threads/pr-check")[0] == 404


def test_check_pr_with_diff_text_finds_revived_name(api):
    diff = (EXAMPLES / "pr-check" / "change.diff").read_text()
    status, body, _ = api("POST", "/api/check-pr", {"diff": diff})
    assert status == 200
    assert body["source"]["kind"] == "diff"
    assert body["changed_files"] == [{"path": "src/typing_extensions.py", "old_path": None, "added": 3, "removed": 0}]
    assert len(body["matches"]) == 6
    conflicts = [c for m in body["matches"] for c in m["conflicts"]]
    narrower = [c for c in conflicts if c["alternative"].startswith("TypeNarrow")]
    # One card for the revived name, carrying the reason its quote supports (post 29).
    assert len(narrower) == 1 and narrower[0]["line"] == "TypeNarrower = TypeIs"
    assert "awkward" in narrower[0]["reason"]
    assert "brings back an approach the discussion rejected" in body["report_markdown"]
    assert body["report_markdown"].startswith("## DecisionTrail")
    assert api("POST", "/api/check-pr", {})[0] == 400
    assert api("POST", "/api/check-pr", {"pr_url": "https://example.com/x"})[0] == 400


def test_repos_add_and_delete(api, monkeypatch):
    monkeypatch.setattr(server, "fetch_repo_metadata", lambda name: {
        "full_name": "python/typing_extensions", "html_url": "https://github.com/python/typing_extensions",
        "description": "Backported typing hints", "stargazers_count": 500, "language": "Python", "default_branch": "main",
    })
    status, body, _ = api("POST", "/api/repos", {"repo": "https://github.com/python/typing_extensions"})
    assert status == 201
    assert body["repo"]["full_name"] == "python/typing_extensions" and body["repo"]["linked_decisions"] == 0
    assert api("GET", "/api/stats")[1]["totals"]["connected_repositories"] == 1
    assert api("POST", "/api/repos", {"repo": "x", "local_path": str(api.tmp)})[0] == 400

    monkeypatch.setattr(server, "fetch_repo_metadata", lambda name: None)
    status, body, _ = api("POST", "/api/repos", {"repo": "someone/thing"})
    assert status == 201 and body["repo"]["url"] == "https://github.com/someone/thing" and body["repo"]["stars"] is None
    assert len(api("GET", "/api/repos")[1]["repos"]) == 2
    assert api("DELETE", "/api/repos/someone/thing")[1] == {"ok": True}
    assert api("DELETE", "/api/repos/someone/thing")[0] == 404
    assert [r["full_name"] for r in api("GET", "/api/repos")[1]["repos"]] == ["python/typing_extensions"]


def _wait(api, job_id):
    for _ in range(200):
        job = api("GET", f"/api/jobs/{job_id}")[1]["job"]
        if job["status"] in ("done", "error"):
            return job
        time.sleep(0.01)
    raise AssertionError("job did not finish")


def test_analyze_with_fake_backend(api, monkeypatch, parser_thread):
    monkeypatch.setattr(server.sources, "load_thread", lambda spec: parser_thread)
    monkeypatch.setattr(server, "check_ollama", lambda host, model, timeout=3: {"reachable": True, "model_available": True, "error": None})
    api.app.make_backend = lambda: FakeBackend([RAW])

    status, body, _ = api("POST", "/api/analyze", {"url": "https://discuss.python.org/t/test-thread/1"})
    assert status == 202 and body["job"]["status"] in ("queued", "running", "done")
    job = _wait(api, body["job"]["id"])
    assert job["status"] == "done", job["error"]
    stages = {s["key"]: s for s in job["stages"]}
    assert [s["key"] for s in job["stages"]] == ["fetch", "posts", "identify", "alternatives", "verify", "link", "records"]
    assert stages["link"]["status"] == "skipped"
    assert all(s["status"] == "done" for k, s in stages.items() if k != "link")
    assert stages["verify"]["detail"].endswith("quotes found in their posts")
    assert job["result"]["decisions"] == 1 and job["log"]

    decisions = api("GET", "/api/decisions")[1]["decisions"]
    live = next(d for d in decisions if d["id"] == job["result"]["decision_ids"][0])
    assert live["origin"] == "analysis" and live["datasets"] == ["analyses"]
    assert live["discussion_title"] == "Test thread" and live["date"]
    threads = api("GET", "/api/threads")[1]["threads"]
    live_thread = next(t for t in threads if t["kind"] == "analysis")
    assert api("GET", f"/api/threads/{live_thread['id']}")[0] == 200
    assert (api.tmp / "dt" / "records" / "README.md").exists()
    assert json.loads((api.tmp / "dt" / "jobs.json").read_text())["jobs"][0]["status"] == "done"
    assert api("GET", "/api/jobs")[1]["jobs"][0]["id"] == job["id"]


def test_analyze_fails_cleanly_without_ollama(api, monkeypatch, parser_thread):
    monkeypatch.setattr(server.sources, "load_thread", lambda spec: parser_thread)
    job = _wait(api, api("POST", "/api/analyze", {"url": "https://discuss.python.org/t/test-thread/1"})[1]["job"]["id"])
    assert job["status"] == "error" and "Ollama" in job["error"]
    assert job["result"] is None
    assert not (api.tmp / "dt" / "decisions.json").exists()
    assert api("POST", "/api/analyze", {})[0] == 400


def test_cors_and_static_fallback(api):
    _, _, headers = api("GET", "/api/datasets", headers={"Origin": "http://localhost:5173"})
    assert headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    _, _, headers = api("GET", "/api/datasets", headers={"Origin": "https://evil.example"})
    assert headers.get("Access-Control-Allow-Origin") is None
    status, page, _ = api("GET", "/")
    assert status == 200 and "npm run build" in page
    assert api("GET", "/api/nope")[0] == 404


def test_spa_serves_built_files(tmp_path):
    web = tmp_path / "dist"
    (web / "assets").mkdir(parents=True)
    (web / "index.html").write_text("<div id=root></div>")
    (web / "assets" / "app.js").write_text("console.log(1)")
    app = server.App(store_path=str(tmp_path / "d.json"), web_dir=str(web), start_worker=False)
    httpd = server.make_server(app, "127.0.0.1", 0)
    threading.Thread(target=httpd.serve_forever, kwargs={"poll_interval": 0.02}, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    try:
        assert urllib.request.urlopen(base + "/assets/app.js").read() == b"console.log(1)"
        assert urllib.request.urlopen(base + "/decisions/D-1").read() == b"<div id=root></div>"
        assert urllib.request.urlopen(base + "/../../etc/passwd").read() == b"<div id=root></div>"
    finally:
        httpd.shutdown()
        httpd.server_close()


def test_link_resolves_to_connected_repo(api, monkeypatch):
    import subprocess

    repo = api.tmp / "checkout"
    repo.mkdir()
    def run(*a):
        return subprocess.run(["git", "-C", str(repo), *a], check=True, capture_output=True, text=True).stdout

    run("init", "-q")
    (repo / "core.py").write_text("def parse_block(): pass\n")
    run("add", ".")
    run("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "init")
    sha = run("rev-parse", "HEAD").strip()
    live = {"decisions": [{"id": "D-live0001", "title": "Keep parse_block", "status": "accepted", "summary": "", "rationale": "",
                           "links": [{"path": "core.py", "symbol": "parse_block", "line": 1, "commit": sha, "how": "test"}]}]}
    (api.tmp / "dt").mkdir(exist_ok=True)
    (api.tmp / "dt" / "decisions.json").write_text(json.dumps(live))
    monkeypatch.setattr(server, "fetch_repo_metadata", lambda name: None)
    status, body, _ = api("POST", "/api/repos", {"repo": "me/checkout", "local_path": str(repo)})
    assert status == 201 and body["repo"]["linked_decisions"] == 1
    d = api("GET", "/api/decisions/D-live0001")[1]["decision"]
    assert d["links"][0]["repo"] == "me/checkout" and d["origin"] == "analysis"


def test_api_refuses_requests_a_web_page_could_forge(api):
    # A cross-site form or text/plain POST skips the CORS preflight, so the body must be JSON.
    assert api("POST", "/api/check-pr", {"diff": "x"}, headers={"Content-Type": "text/plain"})[0] == 415
    # DNS rebinding: a request addressed to another host name is refused.
    assert api("GET", "/api/health", headers={"Host": "evil.example:8765"})[0] == 403
    # Only GitHub and discuss.python.org discussions, never local files or other hosts.
    assert api("POST", "/api/analyze", {"url": "/etc/passwd.json"})[0] == 400
    assert api("POST", "/api/analyze", {"url": "https://evil.example/t/x/1"})[0] == 400
    assert api("POST", "/api/check-pr", {"diff": ["not", "text"]})[0] == 400


def test_check_pr_refuses_option_like_and_unknown_refs(api, tmp_path):
    import subprocess

    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@e", "commit", "-q", "--allow-empty", "-m", "x"], check=True)
    status, body, _ = api("POST", "/api/check-pr", {"repo_path": str(repo), "base": "--output=/tmp/owned"})
    assert status == 400 and "Not a git ref" in body["error"]
    status, body, _ = api("POST", "/api/check-pr", {"repo_path": str(repo), "base": "no-such-branch"})
    assert status == 400 and "not a commit" in body["error"]
    assert not list(tmp_path.glob("owned*")) and not Path("/tmp/owned...HEAD").exists()

