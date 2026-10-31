import pytest

from decisiontrail.models import Post, Thread


def make_thread(bodies, source="local:test", files=None, platform="local"):
    posts = [
        Post(
            id=str(i),
            author=f"user{i}",
            created_at=f"2024-01-{i:02d}T00:00:00Z",
            body=body,
            url=f"https://example.org/t/1/{i}",
            platform=platform,
        )
        for i, body in enumerate(bodies, start=1)
    ]
    return Thread(source=source, title="Test thread", url="https://example.org/t/1", posts=posts, files=files or [])


@pytest.fixture
def parser_thread():
    return make_thread(
        [
            "I propose we rewrite the parser in Rust to make it memory safe.",
            "We tried a Rust rewrite in 2022 and reverted it because it was 2x slower on big files.",
            "Agreed. Let's keep the C parser in parser/core.c and fix the bugs in `parse_block` instead.",
            "Decision: we keep the C parser. The Rust rewrite stays rejected until it matches performance.",
        ]
    )
