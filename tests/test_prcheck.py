from decisiontrail.models import Alternative, CodeLink, Decision, Evidence
from decisiontrail.prcheck import match_decisions, parse_diff, render_report

DIFF = """diff --git a/parser/core.py b/parser/core.py
index 1111111..2222222 100644
--- a/parser/core.py
+++ b/parser/core.py
@@ -4,2 +4,2 @@ import os
 def parse_block(text):
-    return text.split()
+    return fast_split(text)
diff --git a/docs/a.md b/docs/b.md
similarity index 90%
rename from docs/a.md
rename to docs/b.md
"""


def make(id, links, code_refs=()):
    return Decision(
        id=id,
        title=f"Decision {id}",
        status="accepted",
        summary="Keep it in C.",
        rationale="Faster.",
        evidence=[Evidence("2", "keep it in C", url="https://x/2", author="bob", verified=True)],
        alternatives=[Alternative("Rust rewrite", "2x slower", [Evidence("3", "2x slower", url="https://x/3", verified=True)])],
        links=links,
        code_refs=list(code_refs),
        sources=["https://x"],
    )


def test_parse_diff_files_ranges_and_renames():
    changes = parse_diff(DIFF)
    assert changes[0].paths == ["parser/core.py", "parser/core.py"]
    assert changes[0].old_ranges == [(4, 5)]
    assert "    return fast_split(text)" in changes[0].text
    assert changes[1].paths == ["docs/a.md", "docs/b.md"]


def test_match_ranks_symbol_over_path():
    decisions = [
        make("path-only", [CodeLink(path="parser/core.py")]),
        make("symbol", [CodeLink(path="parser/core.py", symbol="parse_block")]),
        make("unrelated", [CodeLink(path="other.py", symbol="x")]),
        make("by-name", [], code_refs=["fast_split"]),
    ]
    matches = match_decisions(decisions, parse_diff(DIFF))
    assert [m.decision.id for m in matches] == ["symbol", "by-name", "path-only"]
    assert "changes `parse_block` in `parser/core.py`" in matches[0].reasons


def test_match_by_line_range():
    d = make("line", [CodeLink(path="parser/core.py", line=12)])
    assert match_decisions([d], parse_diff(DIFF))[0].score == 3


def test_report_lists_rejected_alternatives_with_sources():
    report = render_report(match_decisions([make("s", [CodeLink(path="parser/core.py", symbol="parse_block")])], parse_diff(DIFF)))
    assert "Decision s (ACCEPTED)" in report
    assert "- Rust rewrite: 2x slower ([post 3](https://x/3))" in report
    assert "> bob, [post 2](https://x/2)" in report


def test_report_when_nothing_matches():
    assert "No recorded decisions" in render_report([])
