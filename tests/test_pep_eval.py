from decisiontrail.pep_eval import drop_leaked_posts, pep_header, rejected_ideas, strip_rst
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
