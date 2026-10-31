from decisiontrail.sources import html_to_text, load_discourse, load_github, load_thread, save_thread


def test_html_to_text_keeps_code_and_quotes():
    html = (
        '<aside class="quote"><div class="title">alice said:</div>'
        "<blockquote><p>Use a decorator</p></blockquote></aside>"
        "<p>No, use <code>TypeIs</code> instead.</p><pre><code>x = 1</code></pre>"
    )
    text = html_to_text(html)
    assert "> Use a decorator" in text
    assert "alice said" not in text
    assert "`TypeIs`" in text
    assert "x = 1" in text


def test_inline_code_inside_a_quote_stays_on_one_quoted_line():
    html = (
        "<blockquote><p>How <code>TypeIs</code> works is like <code>cast</code>.</p>"
        "<ul><li>keep <code>TypeGuard</code></li></ul></blockquote><p>Agreed.</p>"
    )
    assert html_to_text(html) == "> How `TypeIs` works is like `cast`.\n\n> - keep `TypeGuard`\n\nAgreed."


def test_quote_title_with_avatar_does_not_swallow_the_post():
    html = (
        '<aside class="quote"><div class="title"><div class="quote-controls"></div>'
        '<img alt="" width="24" src="a.png" class="avatar"> bob:</div>'
        "<blockquote><p>old idea</p></blockquote></aside><p>My reply after the quote.</p>"
    )
    text = html_to_text(html)
    assert "> old idea" in text
    assert "My reply after the quote." in text
    assert "bob:" not in text


def test_load_discourse_fetches_missing_posts():
    calls = []

    def fetch(url):
        calls.append(url)
        if url.endswith("/t/42.json"):
            return {
                "title": "PEP 999",
                "slug": "pep-999",
                "post_stream": {
                    "stream": [1, 2, 3],
                    "posts": [
                        {"id": 1, "post_number": 1, "username": "a", "name": "Ann Lee", "created_at": "2024", "cooked": "<p>first</p>"},
                    ],
                },
            }
        assert "post_ids[]=2" in url and "post_ids[]=3" in url
        return {
            "post_stream": {
                "posts": [
                    {"id": 3, "post_number": 3, "username": "c", "created_at": "2024", "cooked": "<p>third</p>"},
                    {"id": 2, "post_number": 2, "username": "b", "created_at": "2024", "cooked": "<p>second</p>", "post_type": 3},
                ]
            }
        }

    thread = load_discourse("discuss.example.org", 42, fetch)
    assert [p.id for p in thread.posts] == ["1", "3"]  # post 2 is a moderator action
    assert thread.posts[0].display_name == "Ann Lee"
    assert thread.posts[1].url == "https://discuss.example.org/t/pep-999/42/3"
    assert len(calls) == 2


def test_load_github_pull_request_includes_review_comments_and_files():
    def user(name):
        return {"login": name}


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
        if url.endswith("/users/alice"):
            return {"login": "alice", "name": "Alice Example"}
        if url.endswith("/users/bob"):
            raise OSError("rate limited")
        if "/users/" in url:
            return {"login": url.rsplit("/", 1)[1], "name": None}
        raise AssertionError(url)

    thread = load_github("o", "r", 7, fetch)
    assert [p.author for p in thread.posts] == ["alice", "carol", "bob"]
    assert thread.posts[1].path == "parser/core.c" and thread.posts[1].line == 40
    assert thread.files == ["parser/core.c"]
    assert thread.source == "github:o/r#7"
    assert [p.display_name for p in thread.posts] == ["Alice Example", "", ""]


def test_thread_json_round_trip(tmp_path, parser_thread):
    path = tmp_path / "thread.json"
    save_thread(parser_thread, str(path))
    loaded = load_thread(str(path))
    assert loaded == parser_thread
