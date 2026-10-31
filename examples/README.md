# Examples

All outputs here were produced by DecisionTrail with `qwen2.5:7b-instruct`
running locally in Ollama on an Apple M5 laptop with 16 GB RAM. Every model
response was recorded to `model-responses.json`. CI replays those recordings
and checks that each `report.md` comes out byte for byte the same.

## `pep-742/`: PEP 742 (TypeIs), the organizers' evaluation scenario

Input: the PEP's discussion on discuss.python.org (`thread.json`, 33 posts), and
the PEP source (`pep-742.rst`), which is only used for scoring.

```bash
decisiontrail eval-pep 742 --pep-file examples/pep-742/pep-742.rst \
  --thread examples/pep-742/thread.json --record examples/pep-742/model-responses.json \
  --judge --out examples/pep-742
```

Output: [`report.md`](pep-742/report.md), [`decisions.json`](pep-742/decisions.json)
and one Markdown record per decision in [`decisions/`](pep-742/decisions/).

Result: 7 decisions with 17 rejected alternatives, and all 62 quotes were found
in the posts they cite. **1 of the PEP's 3 rejected ideas was recovered with the
PEP's reason**: "Alternative names", via `TypeCheck`, which the thread rejected
for being confusable with "type checking". "Change the behavior of TypeGuard"
was not found. For "Do nothing" the local model picked `ForceTypeIs`, a
different idea with a different reason; its similarity is 0.04 and the reason
does not agree, so the scoring does not count it, and the report says so. The
run took about 5 minutes.

## `pep-709/`: PEP 709 (inlined comprehensions)

Same command with 709, about 3.5 minutes. Result: 10 decisions and 7 rejected
alternatives from 39 posts, and all 37 quotes were found in their posts. The
PEP's one rejected idea ("More efficient comprehension calling, without
inlining") was **not** recovered: it was discussed on a CPython pull request,
not in this thread, so it is not in the input. We kept this example because it
shows the tool does not invent an idea the discussion never had.

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

[`report.md`](pr-check/report.md) lists the 6 decisions linked to `TypeIs`, with
`TypeNarrower` among the rejected names ("too awkward and jargon-y") and links to
the posts. This example has no `model-responses.json` of its own: it replays the
PEP 742 recordings.

## Known weaknesses seen in these runs

- A 7B model sometimes words a reason loosely. In `pr-check/report.md`, the first
  decision lists `TypeNarrower` with a sentence that describes the name instead of
  saying why it was dropped. The quotes are verified; the summaries written by the
  model are not.
- The thread used the draft name `TypeNarrower` until post 4, when it settled on
  `TypeIs`. One decision ("Compatibility with existing TypeGuard") still calls
  the new form "TypeNarrower" in its summary.
- The same question can come out twice under different titles when the titles
  are too different to merge: in `pep-742`, "Name of the new special form" and
  "Name of the Type Narrowing Function", and "Adopt the proposal as a whole" and
  "Adoption of PEP 742".
- With `--judge`, the model sometimes picks a candidate that is not the same idea
  (`ForceTypeIs` for "Do nothing"). The scoring only counts a pick when the
  reason agrees or the similarity reaches 0.2, so this one is reported but not
  counted.

## Third-party content

`pep-*/thread.json`, and the quotes in the reports, decision records and the
`prompt_head` fields of `model-responses.json`, are copied from public
discuss.python.org posts. They belong to the authors named in each post, each
post links to its original, and the post HTML was converted to plain text. This
material is not covered by this repository's MIT license. `pep-709.rst` and
`pep-742.rst` come from [python/peps](https://github.com/python/peps), where
PEPs are placed in the public domain or under CC0-1.0. The context lines in
`pr-check/change.diff` come from python/typing_extensions, which is under the
Python Software Foundation License.
