from decisiontrail.grounding import locate, normalize, verify_evidence
from decisiontrail.models import Evidence


def test_normalize_ignores_case_quotes_and_markup():
    assert normalize("Keep the **C** parser’s `speed`.") == "keep the c parser's speed"


def test_exact_quote_is_verified(parser_thread):
    ev = verify_evidence(Evidence("2", "reverted it because it was 2x slower on big files"), parser_thread)
    assert ev.verified and ev.match_score == 1.0
    assert ev.url.endswith("/2") and ev.author == "user2"


def test_slightly_misquoted_text_is_verified_and_corrected(parser_thread):
    ev = verify_evidence(Evidence("2", "we tried the Rust rewrite in 2022 and reverted it"), parser_thread)
    assert ev.verified
    assert ev.quote.startswith("We tried a Rust rewrite")


def test_wrong_post_number_is_fixed(parser_thread):
    ev = verify_evidence(Evidence("1", "Let's keep the C parser in parser/core.c"), parser_thread)
    assert ev.verified and ev.post_id == "3"


def test_made_up_quote_is_not_verified(parser_thread):
    ev = verify_evidence(Evidence("2", "the Rust version crashed on Windows every time"), parser_thread)
    assert not ev.verified
    assert ev.match_score < 0.85


def test_locate_finds_fuzzy_window():
    score, text = locate("keep the parser written in C", "We will keep the parser written in C for now.")
    assert score == 1.0 or text
