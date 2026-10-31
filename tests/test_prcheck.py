from decisiontrail.models import Alternative, CodeLink, Decision, Evidence
from decisiontrail.prcheck import Match, added_lines, find_conflicts, match_decisions, parse_diff, render_report

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
    assert "No recorded decision covers the lines this change touches." in render_report([])


def test_file_only_matches_are_collapsed():
    far = """diff --git a/parser/core.py b/parser/core.py
--- a/parser/core.py
+++ b/parser/core.py
@@ -200,1 +200,1 @@
-# old comment
+# fixed typo in a comment
"""
    matches = match_decisions([make("s", [CodeLink(path="parser/core.py", symbol="parse_block", line=5)])], parse_diff(far))
    report = render_report(matches, diff=far)
    assert "No recorded decision covers the lines this change touches." in report
    assert "Also in the changed files, but not the linked code: 1 decision(s) (Decision s)." in report
    assert "### Decision s" not in report


def test_report_leads_with_a_revived_alternative():
    diff = """diff --git a/parser/core.py b/parser/core.py
--- a/parser/core.py
+++ b/parser/core.py
@@ -4,2 +4,3 @@
 def parse_block(text):
+    # Rust rewrite of parse_block, see the old branch
     return text.split()
"""
    matches = match_decisions([make("s", [CodeLink(path="parser/core.py", symbol="parse_block")])], parse_diff(diff))
    report = render_report(matches, diff=diff)
    assert report.index("brings back an approach the discussion rejected") < report.index("### Decision s")
    assert "revives **Rust rewrite**, rejected because: 2x slower ([post 3](https://x/3))" in report


REVIVE = """diff --git a/src/names.py b/src/names.py
--- a/src/names.py
+++ b/src/names.py
@@ -10,2 +10,4 @@
 TypeIs = _special_form("TypeIs")
+# kept for old code
+TypeNarrower = TypeIs
"""


def test_added_lines_skips_context_and_headers():
    assert added_lines(REVIVE) == ["# kept for old code", "TypeNarrower = TypeIs"]


def test_find_conflicts_reports_a_revived_rejected_alternative():
    decision = Decision(
        id="D-1", title="Name of the new form", status="accepted", summary="", rationale="",
        alternatives=[
            Alternative("TypeNarrow[er]", "Too awkward and jargon-y."),
            Alternative("IsInstance", "Not the preferred name."),
            Alternative("TI", "Too short to search for."),
        ],
    )
    conflicts = find_conflicts(Match(decision, 3, []), REVIVE)
    assert conflicts == [{"alternative": "TypeNarrow[er]", "reason": "Too awkward and jargon-y.", "line": "TypeNarrower = TypeIs"}]

