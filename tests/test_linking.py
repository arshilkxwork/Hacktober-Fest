import subprocess

import pytest

from decisiontrail.linking import find_definitions, link_decision, refs_from_text
from decisiontrail.models import Alternative, Decision, Evidence


def run(repo, *args):
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


@pytest.fixture
def repo(tmp_path):
    run(tmp_path, "init", "-q", "-b", "main")
    run(tmp_path, "config", "user.email", "t@example.org")
    run(tmp_path, "config", "user.name", "Test")
    (tmp_path / "parser").mkdir()
    (tmp_path / "parser" / "core.py").write_text(
        "import os\n\n\ndef parse_block(text):\n    return text.split()\n\n\nclass Tokenizer:\n    pass\n"
    )
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_core.py").write_text("from parser.core import parse_block\n\n\ndef parse_block_helper():\n    pass\n")
    run(tmp_path, "add", ".")
    run(tmp_path, "commit", "-q", "-m", "init")
    return tmp_path


def test_refs_from_text():
    paths, idents = refs_from_text("Keep `parse_block` in parser/core.py; see Tokenizer and `os.path.join()` and None.")
    assert paths == ["parser/core.py"]
    assert "parse_block" in idents and "os.path.join" in idents and "Tokenizer" not in idents
    assert "None" not in idents


def test_find_definitions_prefers_source(repo):
    assert find_definitions(str(repo), "parse_block") == [("parser/core.py", 4)]
    assert find_definitions(str(repo), "Tokenizer") == [("parser/core.py", 8)]
    assert find_definitions(str(repo), "does_not_exist") == []


def decision():
    return Decision(
        id="D-1",
        title="Keep the parser in Python",
        status="accepted",
        summary="Keep `parse_block` simple.",
        rationale="Speed is fine.",
        evidence=[Evidence("1", "keep parse_block", verified=True)],
        alternatives=[Alternative("Rewrite core.py in Rust", "slower", [])],
        code_refs=["Tokenizer"],
    )


def test_link_decision_finds_paths_and_symbols(repo, parser_thread):
    links = link_decision(decision(), parser_thread, str(repo))
    found = {(l.path, l.symbol) for l in links}
    assert ("parser/core.py", "parse_block") in found
    assert ("parser/core.py", "Tokenizer") in found
    assert ("parser/core.py", None) in found  # "core.py" resolved by suffix
    assert all(l.commit for l in links)
