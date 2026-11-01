import pytest

from decisiontrail import store
from decisiontrail.models import Alternative, CodeLink, Decision, Evidence


def sample(id="D-1", title="Keep the C parser"):
    return Decision(
        id=id,
        title=title,
        status="accepted",
        summary="Parser stays in C.",
        rationale="Rust was slower.",
        evidence=[Evidence("4", "we keep the C parser", url="https://x/4", author="dee", verified=True)],
        alternatives=[Alternative("Rust rewrite", "2x slower", [Evidence("2", "made up", verified=False)])],
        links=[CodeLink(path="parser/core.c", symbol="parse_block", line=40, how="identifier named in discussion")],
        sources=["https://x"],
        participants=["dee"],
    )


def test_save_load_round_trip(tmp_path):
    path = tmp_path / "d.json"
    store.save(str(path), [sample()], "qwen2.5:7b-instruct")
    loaded = store.load(str(path))
    assert loaded[0].to_dict() == sample().to_dict()
    assert store.load(str(tmp_path / "missing.json")) == []


def test_upsert_replaces_by_id():
    merged = store.upsert([sample("D-1", "old"), sample("D-2")], [sample("D-1", "new")])
    assert sorted(d.title for d in merged) == ["Keep the C parser", "new"]


def test_markdown_marks_unverified_quotes(tmp_path):
    md = store.to_markdown(sample())
    assert "- Traceability: 1 of 2 quotes found verbatim in the source" in md
    assert "NOT FOUND in source, check manually" in md
    assert "`parser/core.c:40` `parse_block`" in md
    paths = store.export_markdown([sample()], str(tmp_path / "out"))
    assert paths[0].name == "0001-keep-the-c-parser.md"
    assert "| D-1 | accepted |" in (tmp_path / "out" / "README.md").read_text()


def test_load_rejects_a_file_that_is_not_a_store(tmp_path):
    path = tmp_path / "decisions.json"
    path.write_text('{"decisions": [{"title": "no id"}]}', encoding="utf-8")
    with pytest.raises(ValueError, match="not a DecisionTrail store"):
        store.load(str(path))
