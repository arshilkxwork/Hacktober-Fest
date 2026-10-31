# Examples

All outputs here were produced by DecisionTrail with `qwen2.5:7b-instruct`
running locally in Ollama on an Apple M5 laptop with 16 GB RAM. Every model
response was recorded to `model-responses.json`. CI replays those recordings
and checks that each `report.md` comes out byte for byte the same.

## The organizers' evaluation scenario: five PEPs

For each PEP the system gets only the PEP's discussion on discuss.python.org
(`thread.json`); the PEP source (`pep-NNN.rst`) is used only for scoring:

```bash
decisiontrail eval-pep 742 --pep-file examples/pep-742/pep-742.rst \
  --thread examples/pep-742/thread.json --record examples/pep-742/model-responses.json \
  --judge --out examples/pep-742
```

Each folder holds the input, the recordings, `report.md`, `decisions.json` and
one Markdown record per decision in `decisions/`.

| PEP | Posts | Decisions | Quotes found in their post | Rejected ideas recovered |
|---|---|---|---|---|
| [742](pep-742/report.md) TypeIs | 33 | 7 | 62 of 62 | 0 of 3 |
| [709](pep-709/report.md) inlined comprehensions | 39 | 10 | 35 of 37 | 0 of 1 |
| [688](pep-688/report.md) buffer protocol | 19 | 5 | 18 of 18 | 1 of 3 |
| [705](pep-705/report.md) read-only TypedDict items | 40 | 7 | 43 of 43 | 1 of 7 |
| [698](pep-698/report.md) override decorator | 11 | 3 | 5 of 5 | 0 of 4 |

How a rejected idea is scored: TF-IDF finds the 10 extracted rejected ideas most
similar to the PEP's item, and the local model picks the one that is the same
idea, if any, quoting the PEP words it matches. The pick counts only when its
similarity is at least 0.2, when the PEP item names it, or when the quoted PEP
words are in the item and share a specific word with it. Each report says which
of these counted a match, and what the model picked when nothing was counted.

What the results show, honestly:

- The two recovered ideas are solid: PEP 688's "Distinguish between mutable and
  immutable buffers" (similarity 0.39, reason agrees) and PEP 705's "Reusing the
  Final annotation" via `Final` (0.45, reason agrees).
- PEP 742: the thread's naming debate was extracted (TypeCheck, IsInstance,
  Narrowed, TypeNarrower are all there with reasons), but the PEP lists them as
  one item, "Alternative names", and the model matched it to a vague extracted
  item ("Other proposed names") that the scoring does not count. "Change the
  behavior of TypeGuard" (the PEP 724 idea) is argued in posts 1, 32 and 34 and
  was extracted only as a rejected name `TypeGuard` and as "Introducing backward
  incompatibilities", which the model did not match.
- PEP 709: the rejected idea (a new opcode to call comprehensions without
  inlining) is argued in posts 21 and 27 of an earlier thread,
  ["Inlining comprehensions -- what are the compatibility constraints?"](https://discuss.python.org/t/22527),
  and never in the PEP thread; `eval-pep` reads one thread, so it was not in the
  input. Two of its quotes are marked unverified: the model quoted "Doesn't
  matter?" for a post that says "Does it matter?".
- PEP 698: the 11-post thread discusses the decorator itself and no alternative,
  so nothing could be recovered from it.

## `pr-check/`: surfacing a decision when code changes

1. Extract the PEP 742 decisions and link them to a checkout of
   [python/typing_extensions](https://github.com/python/typing_extensions) at
   `cfde842`, which implements `TypeIs` (replaying the recorded model output):
   ```bash
   decisiontrail extract examples/pep-742/thread.json --repo ../typing_extensions \
     --replay examples/pep-742/model-responses.json \
     --store examples/pr-check/decisions.json --export examples/pr-check/decisions
   ```
   `TypeIs` was linked to `src/typing_extensions.py:2329` and `TypeGuard` to line 2276.
2. A sample change ([`change.diff`](pr-check/change.diff)) adds
   `TypeNarrower = TypeIs`, reviving the draft name the discussion dropped.
3. From inside the typing_extensions checkout, on the branch with the change:
   ```bash
   decisiontrail check-pr --store ../Hacktober-Fest/examples/pr-check/decisions.json \
     --repo . --base main --output report.md
   ```
   CI runs the same check from the diff file instead, with
   `--diff examples/pr-check/change.diff --no-repo`, and gets the same report.

[`report.md`](pr-check/report.md) opens with the revived name: the change
"revives TypeNarrow[er], rejected because: Too awkward and jargon-y", linked to
the post that says so (post 29). It then lists the 6 decisions whose linked
symbol `TypeIs` the change touches. Decisions that only share the file, without
the linked code, are folded into one line at the end. This example has no
`model-responses.json` of its own: it replays the PEP 742 recordings.

## Known weaknesses seen in these runs

- A 7B model sometimes words a reason loosely or attaches it to the wrong
  alternative. A verified quote proves where the words came from, not that the
  model's summary next to it is right.
- The thread used the draft name `TypeNarrower` until post 4, when it settled on
  `TypeIs`. One decision ("Compatibility with existing TypeGuard") still calls
  the new form "TypeNarrower" in its summary.
- The same question can come out twice under different titles when the titles
  are too different to merge: in `pep-742`, "Name of the new special form" and
  "Name of the Type Narrowing Function", and "Adopt the proposal as a whole" and
  "Adoption of PEP 742".
- Statuses lean towards "open": both PEPs were accepted, yet several of their
  decisions stay open because the posts that settled them say so indirectly.
- Each excerpt is split into at most 6 topics; extra topics are logged as not
  extracted rather than dropped silently.

## Third-party content

`pep-*/thread.json`, and the quotes in the reports, decision records and the
`prompt_head` fields of `model-responses.json`, are copied from public
discuss.python.org posts. They belong to the authors named in each post, each
post links to its original, and the post HTML was converted to plain text. This
material is not covered by this repository's MIT license. The `pep-*.rst` files
come from [python/peps](https://github.com/python/peps), where PEPs are placed
in the public domain or under CC0-1.0. The context lines in
`pr-check/change.diff` come from python/typing_extensions, which is under the
Python Software Foundation License.
