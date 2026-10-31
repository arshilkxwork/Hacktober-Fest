import json
import os
import subprocess

from decisiontrail import cli, llm
from decisiontrail.extract import SCHEMA, SYSTEM_PROMPT, TOPICS_PROMPT, TOPICS_SCHEMA, build_prompt
from decisiontrail.sources import save_thread
from test_extract import RAW


def test_extract_with_replay_then_check_pr(tmp_path, parser_thread, capsys):
    thread_file = tmp_path / "thread.json"
    save_thread(parser_thread, str(thread_file))
    recording = llm.Recording(str(tmp_path / "rec.json"))
    excerpt = build_prompt(parser_thread, parser_thread.posts, 1, 1)
    topics = {"topics": [{"question": "Which parser to keep", "posts": [2, 4]}]}
    recording.put(llm._key(llm.DEFAULT_MODEL, TOPICS_PROMPT, excerpt, TOPICS_SCHEMA), llm.DEFAULT_MODEL, excerpt, topics)
    focus = excerpt + "\nRecord only the decision about this question: Which parser to keep"
    recording.put(llm._key(llm.DEFAULT_MODEL, SYSTEM_PROMPT, focus, SCHEMA), llm.DEFAULT_MODEL, focus, RAW)

    store_file = tmp_path / "decisions.json"
    code = cli.main(["extract", str(thread_file), "--store", str(store_file), "--replay", str(tmp_path / "rec.json"),
                     "--export", str(tmp_path / "records")])
    assert code == 0
    data = json.loads(store_file.read_text())
    assert data["model"] == llm.DEFAULT_MODEL
    assert data["decisions"][0]["title"] == "Keep the C parser"
    assert (tmp_path / "records" / "0001-keep-the-c-parser.md").exists()

    diff = tmp_path / "change.diff"
    diff.write_text("diff --git a/x.c b/x.c\n--- a/x.c\n+++ b/x.c\n@@ -1 +1 @@\n-old\n+parse_block(fast)\n")
    out = tmp_path / "report.md"
    assert cli.main(["check-pr", "--store", str(store_file), "--diff", str(diff), "--no-repo", "--output", str(out)]) == 0
    assert "Keep the C parser (ACCEPTED)" in out.read_text()
    assert "Rewrite the parser in Rust" in capsys.readouterr().out


def test_missing_recording_is_reported(tmp_path, parser_thread):
    thread_file = tmp_path / "thread.json"
    save_thread(parser_thread, str(thread_file))
    (tmp_path / "empty.json").write_text('{"responses": {}}')
    assert cli.main(["extract", str(thread_file), "--store", str(tmp_path / "d.json"), "--replay", str(tmp_path / "empty.json")]) == 1


def test_unsupported_input_is_a_clean_error(tmp_path, capsys):
    assert cli.main(["extract", "notes.txt", "--store", str(tmp_path / "d.json")]) == 1
    assert cli.main(["extract", str(tmp_path / "missing.json"), "--store", str(tmp_path / "d.json")]) == 1
    err = capsys.readouterr().err
    assert "error:" in err and "Traceback" not in err


def test_check_pr_fails_loudly_when_git_cannot_diff(tmp_path, parser_thread, capsys):
    store_file = tmp_path / "decisions.json"
    store_file.write_text('{"decisions": []}')
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@e", "commit", "-q", "--allow-empty", "-m", "x"], check=True)
    assert cli.main(["check-pr", "--store", str(store_file), "--repo", str(repo), "--base", "origin/main"]) == 1
    assert cli.main(["check-pr", "--store", str(store_file), "--repo", str(tmp_path), "--base", "main"]) == 1
    assert cli.main(["check-pr", "--store", str(tmp_path / "missing.json"), "--diff", str(store_file)]) == 1
    assert cli.main(["export", "--store", str(tmp_path / "missing.json"), "--out", str(tmp_path / "out")]) == 1
    err = capsys.readouterr().err
    assert "origin/main is not a commit" in err and "is not a git checkout" in err and "No decision store" in err


def test_dotenv_fills_missing_variables_only(tmp_path, monkeypatch):
    (tmp_path / ".env").write_text('# comment\nexport GITHUB_TOKEN="from-file"\nDECISIONTRAIL_MODEL=other\n')
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.setenv("DECISIONTRAIL_MODEL", "kept")
    cli.load_dotenv(str(tmp_path / ".env"))
    assert os.environ["GITHUB_TOKEN"] == "from-file"
    assert os.environ["DECISIONTRAIL_MODEL"] == "kept"
