from decisiontrail.sources import load_github, load_thread, save_thread


def test_load_github_pull_request_includes_review_comments_and_files():
    user = lambda name: {"login": name}

    def fetch(url):
        if url.endswith("/issues/7"):
            return {"title": "Speed up parser", "body": "PR body", "user": user("alice"),
                    "created_at": "2024-01-01T00:00:00Z", "html_url": "https://github.com/o/r/pull/7", "pull_request": {}}
        if "/issues/7/comments" in url:
            return [{"body": "LGTM", "user": user("bob"), "created_at": "2024-01-03T00:00:00Z", "html_url": "u3"}]
        if "/pulls/7/comments" in url:
            return [{"body": "Keep this in C", "user": user("carol"), "created_at": "2024-01-02T00:00:00Z",
                     "html_url": "u2", "path": "parser/core.c", "line": 40}]
        if "/pulls/7/reviews" in url:
            return [{"body": "", "user": user("dan"), "submitted_at": "2024-01-04T00:00:00Z", "html_url": "u4"}]
        if "/pulls/7/files" in url:
            return [{"filename": "parser/core.c"}]
        raise AssertionError(url)

    thread = load_github("o", "r", 7, fetch)
    assert [p.author for p in thread.posts] == ["alice", "carol", "bob"]
    assert thread.posts[1].path == "parser/core.c" and thread.posts[1].line == 40
    assert thread.files == ["parser/core.c"]
    assert thread.source == "github:o/r#7"


def test_thread_json_round_trip(tmp_path, parser_thread):
    path = tmp_path / "thread.json"
    save_thread(parser_thread, str(path))
    loaded = load_thread(str(path))
    assert loaded == parser_thread
