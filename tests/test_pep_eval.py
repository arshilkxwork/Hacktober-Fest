from decisiontrail.models import Alternative, Decision, Evidence
from decisiontrail.pep_eval import drop_leaked_posts, evaluate, pep_header, rejected_ideas, strip_rst
from conftest import make_thread

PEP = """PEP: 999
Title: Faster parsing
Discussions-To: https://discuss.python.org/t/pep-999-faster-parsing/12345
Status: Final

Abstract
========

We make the parser faster by caching ``Token`` objects for every block.

Rejected Ideas
==============

.. _pep-999-rust:

Rewrite the parser in Rust
--------------------------

A rewrite in Rust was tried in 2022 and reverted because it was two times
slower on large files. See :pep:`123` and `the benchmark <https://example.org>`__.

Do nothing
----------

Doing nothing leaves the slow path in place for every user.

Copyright
=========

Public domain.
"""


def test_header_and_strip_rst():
    assert pep_header(PEP, "Title") == "Faster parsing"
    assert pep_header(PEP, "Discussions-To").endswith("/12345")
    assert strip_rst("See :pep:`123` and `the benchmark <https://e>`__ and ``x``") == "See PEP 123 and the benchmark and x"


def test_rejected_ideas_subsections():
    items = rejected_ideas(PEP)
    assert [i.title for i in items] == ["Rewrite the parser in Rust", "Do nothing"]
    assert "two times" in items[0].text and "Copyright" not in items[1].text
    assert ".. _pep" not in items[0].text


def test_rejected_ideas_without_subsections_uses_paragraphs():
    pep = "Rejected Alternatives\n=====================\n\nUsing a global flag was rejected because it leaks between tests.\n\nShort.\n"
    items = rejected_ideas(pep)
    assert len(items) == 1 and items[0].text.startswith("Using a global flag")


def test_drop_leaked_posts():
    pep_body = " ".join(f"word{i}" for i in range(200))
    thread = make_thread([pep_body, "I think the Rust rewrite was slower, so keep C."])
    kept, dropped = drop_leaked_posts(thread, pep_body)
    assert dropped == ["1"] and [p.id for p in kept.posts] == ["2"]


def decisions(verified=True):
    quote = [Evidence(post_id="2", quote="reverted it", verified=verified)]
    return [
        Decision(
            id="D-1",
            title="Speed up parsing",
            status="accepted",
            summary="",
            rationale="",
            alternatives=[
                Alternative("Rust rewrite of the parser", "It was reverted because it ran two times slower on large files.", quote),
                Alternative("Use a global cache flag", "Leaks state between tests.", quote),
            ],
        )
    ]


def test_evaluate_lexical():
    results = evaluate(rejected_ideas(PEP), decisions())
    assert results[0].matched and results[0].candidate.label == "Rust rewrite of the parser"
    assert not results[1].matched


def test_alternative_without_a_verified_quote_is_not_counted():
    results = evaluate(rejected_ideas(PEP), decisions(verified=False))
    assert not any(r.matched for r in results)
    assert all(r.candidate is None for r in results)


class Judge:
    model = "fake"

    def __init__(self):
        self.calls = 0

    def complete_json(self, system, user, schema):
        self.calls += 1
        if "Rewrite the parser in Rust" in user:
            return {"match": 1, "reason_agrees": True}
        return {"match": 0, "reason_agrees": False}


def test_evaluate_with_judge():
    judge = Judge()
    results = evaluate(rejected_ideas(PEP), decisions(), judge=judge)
    assert judge.calls == 2
    assert results[0].matched and results[0].reason_agrees is True
    assert not results[1].matched and results[1].reason_agrees is None


class AlwaysFirstJudge:
    model = "fake"

    def complete_json(self, system, user, schema):
        return {"match": 1, "reason_agrees": False}


def test_judge_pick_needs_an_agreeing_reason_or_the_threshold():
    results = evaluate(rejected_ideas(PEP), decisions(), judge=AlwaysFirstJudge())
    assert results[0].matched and results[0].similarity >= 0.2
    assert not results[1].matched and results[1].candidate is not None and results[1].reason_agrees is False
