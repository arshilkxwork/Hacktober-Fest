"""Check that every quote the model cites really appears in the post it cites.

This is what makes extracted decisions verifiable: a quote that cannot be found
in the source is marked unverified instead of being trusted.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Tuple

from .models import Decision, Evidence, Thread

ACCEPT_SCORE = 0.85

_QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-"})


def normalize(text: str) -> str:
    text = text.translate(_QUOTES).lower()
    text = re.sub(r"^\s*>\s?", "", text, flags=re.M)
    text = re.sub(r"[`*_]", "", text)
    return re.sub(r"\s+", " ", text).strip().strip("\"'.… ")


def _best_window(quote: str, body: str) -> Tuple[float, str]:
    """Best fuzzy match of the quote against same-length word windows of the body."""
    q_words = normalize(quote).split()
    raw_words = body.split()
    if not q_words or not raw_words:
        return 0.0, ""
    norm_words = [normalize(w) for w in raw_words]
    q = " ".join(q_words)
    n = len(q_words)
    best, best_text = 0.0, ""
    for size in {max(1, n - 2), n, n + 2}:
        for i in range(0, max(1, len(norm_words) - size + 1)):
            cand = " ".join(w for w in norm_words[i : i + size] if w)
            if not cand:
                continue
            sm = SequenceMatcher(None, q, cand, autojunk=False)
            if sm.real_quick_ratio() < best or sm.quick_ratio() < best:
                continue
            score = sm.ratio()
            if score > best:
                best, best_text = score, " ".join(raw_words[i : i + size])
    return best, best_text


def locate(quote: str, body: str) -> Tuple[float, str]:
    nq, nb = normalize(quote), normalize(body)
    if nq and nq in nb:
        return 1.0, quote
    return _best_window(quote, body)


def verify_evidence(ev: Evidence, thread: Thread) -> Evidence:
    """Mark the quote verified if found in its post; fix the post id if the model cited the wrong one."""
    post = thread.post(ev.post_id)
    best_score, best_text, best_post = 0.0, "", post
    if post is not None:
        best_score, best_text = locate(ev.quote, post.body)
    if best_score < ACCEPT_SCORE:
        # The model sometimes cites a neighbouring post. Look for the quote elsewhere.
        for other in thread.posts:
            if post is not None and other.id == post.id:
                continue
            score, text = locate(ev.quote, other.body)
            if score > best_score:
                best_score, best_text, best_post = score, text, other
    ev.match_score = round(best_score, 3)
    ev.verified = best_score >= ACCEPT_SCORE
    if ev.verified and best_post is not None:
        ev.post_id = best_post.id
        if best_score < 1.0:
            ev.quote = best_text
    target = best_post if ev.verified else post
    if target is not None:
        ev.url = target.url
        ev.author = target.author
    return ev


def ground_decision(decision: Decision, thread: Thread) -> Decision:
    for ev in decision.all_evidence():
        verify_evidence(ev, thread)
    evidence = decision.all_evidence()
    decision.confidence = round(sum(e.verified for e in evidence) / len(evidence), 2) if evidence else 0.0
    return decision
