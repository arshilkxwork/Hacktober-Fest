import json

from decisiontrail.models import (
    Alternative,
    CodeLink,
    Decision,
    Evidence,
    Thread,
    decision_id,
)


def make_decision():
    return Decision(
        id=decision_id("local:test", "Keep the C parser"),
        title="Keep the C parser",
        status="accepted",
        summary="The parser stays in C.",
        rationale="The Rust rewrite was 2x slower on big files.",
        evidence=[Evidence(post_id="4", quote="we keep the C parser", verified=True, match_score=1.0)],
        alternatives=[
            Alternative(
                name="Rewrite the parser in Rust",
                reason="Reverted in 2022 for being slower.",
                evidence=[Evidence(post_id="2", quote="reverted it because it was 2x slower")],
            )
        ],
        links=[CodeLink(path="parser/core.c", symbol="parse_block", line=12)],
        sources=["local:test"],
        participants=["user1", "user2"],
        confidence=0.8,
    )


def test_decision_survives_a_json_round_trip():
    decision = make_decision()
    loaded = Decision.from_dict(json.loads(json.dumps(decision.to_dict())))
    assert loaded == decision


def test_thread_survives_a_json_round_trip(parser_thread):
    loaded = Thread.from_dict(json.loads(json.dumps(parser_thread.to_dict())))
    assert loaded == parser_thread
    assert loaded.post("2").author == "user2"
    assert loaded.post("99") is None


def test_decision_id_ignores_case_and_surrounding_spaces():
    assert decision_id("pep-742", "Use TypeIs") == decision_id("pep-742", "  use typeis ")
    assert decision_id("pep-742", "Use TypeIs").startswith("D-")


def test_decision_id_depends_on_source_and_title():
    assert decision_id("pep-742", "Use TypeIs") != decision_id("pep-709", "Use TypeIs")
    assert decision_id("pep-742", "Use TypeIs") != decision_id("pep-742", "Keep TypeGuard")


def test_decision_is_verified_by_its_own_or_an_alternatives_evidence():
    decision = make_decision()
    assert decision.verified
    decision.evidence[0].verified = False
    assert not decision.verified
    decision.alternatives[0].evidence[0].verified = True
    assert decision.verified
    assert len(decision.all_evidence()) == 2


def test_from_dict_fills_defaults_for_missing_fields():
    decision = Decision.from_dict({"id": "D-1", "title": "Minimal"})
    assert decision.status == "open"
    assert decision.alternatives == []
    assert decision.confidence == 0.0
