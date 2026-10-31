from decisiontrail.extract import (
    SCHEMA,
    SYSTEM_PROMPT,
    TOPICS_PROMPT,
    TOPICS_SCHEMA,
    build_prompt,
    chunk_posts,
    extract_thread,
    merge_decisions,
    parse_decisions,
    similar,
)
from conftest import make_thread


class FakeBackend:
    """Answers the topic call with `topics` and each focused extraction call from `responses`."""

    model = "fake"

    def __init__(self, responses, topics=("Which parser to keep",)):
        self.responses = list(responses)
        self.topics = [{"question": q, "posts": [1]} for q in topics]
        self.prompts = []

    def complete_json(self, system, user, schema):
        if schema == TOPICS_SCHEMA:
            assert system == TOPICS_PROMPT
            return {"topics": self.topics}
        assert system == SYSTEM_PROMPT and schema == SCHEMA
        self.prompts.append(user)
        return self.responses.pop(0)


RAW = {
    "decisions": [
        {
            "title": "Keep the C parser",
            "status": "accepted",
            "summary": "The parser stays in C.",
            "rationale": "A Rust rewrite was 2x slower on big files.",
            "evidence": [{"post": 4, "quote": "we keep the C parser"}],
            "rejected_alternatives": [
                {
                    "name": "Rewrite the parser in Rust",
                    "reason": "It was 2x slower on big files and was reverted.",
                    "evidence": [{"post": 2, "quote": "reverted it because it was 2x slower on big files"}],
                }
            ],
            "code_refs": ["parser/core.c", "parse_block"],
        }
    ]
}


def test_chunks_respect_budget_and_overlap():
    thread = make_thread(["x" * 900 for _ in range(10)])
    chunks = chunk_posts(thread.posts, budget=3000, overlap=1)
    assert len(chunks) > 1
    for a, b in zip(chunks, chunks[1:]):
        assert a[-1] is b[0]
    assert {p.id for c in chunks for p in c} == {str(i) for i in range(1, 11)}


def test_single_chunk_when_it_fits(parser_thread):
    assert len(chunk_posts(parser_thread.posts)) == 1


def test_prompt_numbers_posts(parser_thread):
    prompt = build_prompt(parser_thread, parser_thread.posts, 1, 1)
    assert "[post 2] user2 (2024-01-02):" in prompt
    assert "Excerpt 1 of 1" in prompt


def test_parse_decisions_skips_empty_and_bad_status(parser_thread):
    raw = {"decisions": [{"title": "", "status": "accepted"}, {"title": "X", "status": "maybe"}]}
    out = parse_decisions(raw, parser_thread)
    assert len(out) == 1 and out[0].status == "open"


def test_merge_combines_same_decision_and_takes_latest_status(parser_thread):
    early = parse_decisions({"decisions": [dict(RAW["decisions"][0], status="open")]}, parser_thread)
    late = parse_decisions({"decisions": [dict(RAW["decisions"][0], title="Keep the C parser implementation", status="accepted")]}, parser_thread)
    merged = merge_decisions([early, late])
    assert len(merged) == 1
    assert merged[0].status == "accepted"
    assert len(merged[0].alternatives) == 1


def test_similar_titles():
    assert similar("Keep the C parser", "Keep the C parser implementation") >= 0.6
    assert similar("Keep the C parser", "Drop Python 3.8 support") < 0.6


def test_extract_thread_end_to_end(parser_thread):
    backend = FakeBackend([RAW])
    decisions = extract_thread(parser_thread, backend)
    assert len(decisions) == 1
    d = decisions[0]
    assert d.verified and d.confidence == 1.0
    assert d.alternatives[0].evidence[0].verified
    assert d.participants == ["user4", "user2"]
    assert d.sources == ["https://example.org/t/1"]


def test_each_topic_gets_its_own_focused_call(parser_thread):
    other = {"decisions": [dict(RAW["decisions"][0], title="Fix bugs in parse_block", status="accepted",
                                rejected_alternatives=[])]}
    backend = FakeBackend([RAW, other], topics=["Which parser to keep", "How to fix parse_block bugs"])
    decisions = extract_thread(parser_thread, backend)
    assert [d.title for d in decisions] == ["Keep the C parser", "Fix bugs in parse_block"]
    assert backend.prompts[0].endswith("Record only the decision about this question: Which parser to keep")
    assert backend.prompts[1].endswith("Record only the decision about this question: How to fix parse_block bugs")


def test_no_topics_means_no_extraction_calls(parser_thread):
    backend = FakeBackend([], topics=[])
    assert extract_thread(parser_thread, backend) == []
    assert backend.prompts == []


def test_code_refs_drop_urls_pep_titles_and_toy_classes():
    from decisiontrail.extract import is_code_ref

    assert not any(is_code_ref(r) for r in ["peps.python.org", "https://x.org/a", "PEP 709: Inlined comprehensions", "class A"])
    assert all(is_code_ref(r) for r in ["typing.TypeIs", "@typing.override", "Python/compile.c", "from __future__ import annotations"])
