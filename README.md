# DecisionTrail

DecisionTrail recovers engineering decisions that were made in public discussions
and never written down. It reads GitHub issues, pull requests and
discuss.python.org threads, extracts each decision with its reasoning and the
alternatives that were rejected (and why), links the decision to the code it is
about, and brings it back up when a later pull request changes that code.

Every decision carries verbatim quotes with links to the posts they came from.
DecisionTrail checks each quote against the source text, so a maintainer can see
which quotes really appear in the discussion. The check proves where a quote
came from; the summaries and reasons around it are the model's wording.

Built by team 404-Error for Hacktoberfest 2026 Hack Day Sonipat, Problem 06.

## Results so far

Real runs with `qwen2.5:7b-instruct` on a 16 GB laptop, recorded and replayed in
CI (details in [examples/README.md](examples/README.md)):

| PEP discussion | Posts | Decisions | Quotes found in their post | Rejected ideas recovered |
|---|---|---|---|---|
| PEP 742 (TypeIs) | 33 | 7 | 62 of 62 | 0 of 3 |
| PEP 709 (inlined comprehensions) | 39 | 10 | 35 of 37 | 0 of 1 |
| PEP 688 (buffer protocol) | 19 | 5 | 18 of 18 | 1 of 3 |
| PEP 705 (read-only TypedDict items) | 40 | 7 | 43 of 43 | 1 of 7 |
| PEP 698 (override decorator) | 11 | 3 | 5 of 5 | 0 of 4 |

Recovering a PEP's rejected ideas is the hard part for a 7B model: 2 of 18, and
a match is counted only with evidence a reader can check in the report. Quote
verification holds up: 163 of 165 quotes were found in the post they cite, and
the other two are marked unverified because the model changed their meaning. A
live run of the PEP 742 thread reproduced the recorded extraction exactly; it
takes about 5 minutes.

## How it works

```
discussion ──► chunk ──► local model (Ollama) ──► merge ──► verify quotes ──► link to code ──► decision store
                                                                                                   │
                                     pull request diff ──► match changed files/symbols ◄───────────┘
                                                                     │
                                                                     ▼
                                                    report of past decisions for this change
```

1. **Load** a thread from GitHub (issue or PR, including review comments and the
   files the PR changed) or from a Discourse forum such as discuss.python.org.
   Post HTML is turned into text that keeps code in backticks and marks quoted
   lines with `> `.
2. **Chunk** long threads into windows of consecutive posts that fit the model's
   context, with one post of overlap.
3. **Extract** with `qwen2.5:7b-instruct` running locally in Ollama, in two
   passes per window. First the model lists the separate questions that were
   decided or debated; then it extracts each question in its own call. (Asked for
   everything at once, the 7B model reported only the most prominent decision.)
   Answers must follow a JSON schema: decisions with status (accepted, rejected,
   open), summary, rationale, rejected alternatives with reasons, quotes with
   post numbers, and code references.
4. **Merge** the same decision found in several windows. The latest status other
   than "open" wins, because later posts show where the discussion ended up.
5. **Verify** every quote. A quote is verified if it appears in the cited post
   (exactly, or with a fuzzy match of 0.85 or more). If the model cited the wrong
   post, the quote is moved to the post that really contains it. Quotes that
   cannot be found anywhere are marked unverified. `extract` drops decisions with
   no verified quote unless `--keep-unverified` is passed; `eval-pep` keeps every
   decision but only scores rejected items that have a verified quote.
6. **Link to code** in a local git checkout, using review comments on the PR,
   file paths named in the discussion (matched exactly, or by suffix when at most
   three files match), identifiers named in the discussion (resolved with
   `git grep` to their definitions), and the files the PR changed. Each link
   records the commit it was made at.
7. **Check a pull request**: parse its diff, follow renames of linked files
   (`git diff -M` from the link's commit, or a fresh search for the linked symbol
   when that commit is not available), and report the decisions whose code was
   touched. The report goes to stdout and to the GitHub Actions job summary. It
   is never posted as a comment.

The same person often appears under different handles on GitHub and Discourse.
Participants are merged when they use the same handle, when their GitHub profile
name and Discourse display name are the same full name, or when an alias file
says so (`--aliases people.json`).

## Install

Requires Python 3.9+ and git. DecisionTrail has no runtime dependencies.

```bash
git clone https://github.com/arshilkxwork/Hacktober-Fest.git
cd Hacktober-Fest
python3 -m venv .venv && source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e ".[dev]"
```

The pip upgrade matters on the Python 3.9 that ships with macOS: its pip is too
old to install a `pyproject.toml` project in editable mode.

Install [Ollama](https://ollama.com) and pull the model:

```bash
ollama serve &
ollama pull qwen2.5:7b-instruct
```

DecisionTrail talks to `http://localhost:11434` by default. `--host` or
`OLLAMA_HOST` changes that and accepts the same forms Ollama does (a URL,
`host:port`, or `0.0.0.0`, which is reached on 127.0.0.1).

## Usage

Extract decisions from a discussion, link them to a checkout and write Markdown
decision records:

```bash
decisiontrail extract https://discuss.python.org/t/pep-742-narrowing-types-with-typenarrower/45613 \
  --repo ../typing_extensions --store decisions.json --export docs/decisions
```

Sources can be a GitHub issue or PR URL, `owner/repo#123`, a Discourse topic URL,
or a thread saved earlier with `decisiontrail fetch URL -o thread.json`.
Set `GITHUB_TOKEN` in the environment (or in a `.env` file, which is
git-ignored) to raise GitHub's rate limit; it is never written to any file.

Write the Markdown records again from a store:

```bash
decisiontrail export --store decisions.json --out docs/decisions
```

Show past decisions about the code a branch changes, from inside the checkout
the decisions were linked to:

```bash
decisiontrail check-pr --store decisions.json --repo ../typing_extensions --base origin/main
```

or for a diff file, matching on the stored paths without reading a checkout:

```bash
decisiontrail check-pr --store decisions.json --diff change.diff --no-repo
```

Run the organizers' evaluation scenario: give the system a PEP's discussion
without the PEP, and measure how many of the PEP's rejected ideas it recovers:

```bash
decisiontrail eval-pep 742 --judge --out results/pep-742
```

`eval-pep` downloads the PEP source from python/peps (or reads `--pep-file`),
loads the thread in its `Discussions-To` header (or `--thread`), removes posts
that copy the PEP text, extracts decisions, and compares the PEP's "Rejected
Ideas" items with the extracted rejected alternatives by TF-IDF similarity. A
match needs a similarity of 0.2. With `--judge`, the local model looks at the
top five candidates, picks the one that is the same idea or none, and says
whether its reason agrees with the PEP. Its pick counts when the reason agrees
or the similarity also reaches 0.2; otherwise the report names the pick and
says it was not counted.

### Discussions in other formats

`--thread` and `extract` also take a JSON file in DecisionTrail's own format, so
a discussion from another source (a mailing-list archive, for example) can be
converted and used:

```json
{
  "source": "mail:python-dev/pep-123",
  "title": "PEP 123 discussion",
  "url": "https://example.org/thread",
  "posts": [
    {"id": "1", "author": "alice", "created_at": "2024-01-01T00:00:00Z",
     "body": "plain text of the message", "url": "https://example.org/thread/1"}
  ]
}
```

Post `id`s are what the model cites, so number them in time order.

### Recording and replaying model output

`--record responses.json` saves every model response keyed by the exact request.
`--replay responses.json` answers from that file instead of calling Ollama. CI
uses this to re-run the examples with the real recorded model output and check
that the committed reports still come out the same.

## Web app

`decisiontrail serve` starts a local API and web app on http://127.0.0.1:8765.
It uses the same pipeline and the same local model as the CLI, and adds no
Python dependencies. The interface needs Node.js once, to build it:

```bash
cd web && npm install && npm run build && cd ..
decisiontrail serve
```

The app shows the decisions from `examples/` and from your own analyses: a
dashboard, a decision explorer with each decision's timeline of quotes, a
discussion analyzer that runs the extraction live and reports each stage, a
pull request check that also flags changes reviving a rejected alternative, and
a list of code links with the repositories you connect. It only reads from
GitHub and never posts anything. The server listens on 127.0.0.1 by default,
answers only requests addressed to this machine, and a `GITHUB_TOKEN` set in its
environment or `.env` stays on the server. See
[web/README.md](web/README.md) for the development setup.

## Examples

See [`examples/`](examples/README.md). The two PEP examples have the input, the
recorded model responses and the output DecisionTrail produced from them. The PR
check example reuses the PEP 742 recordings.

## Tests

```bash
pytest -q
```

The tests cover the loaders (with small hand-written API payloads), HTML
conversion, identity matching, chunking, merging, quote verification, code
linking and rename following in a temporary git repo, diff parsing, the PR
report, PEP parsing and scoring, the API server, and the CLI end to end with a
replayed model response.

CI runs on every pull request and every push to `main`:

| Check | What it does |
|---|---|
| test | `pytest` on Python 3.9 to 3.13 on Linux, and on macOS |
| examples | re-runs the three examples from their recorded model output and fails if a report changes |
| lint | `ruff check .` for syntax errors, undefined names and unused code |
| package | builds the wheel, installs it in a clean environment, runs the CLI and starts `decisiontrail serve` |
| hackathon rules | `scripts/check_rules.py`: HACKATHON.md, the MIT license, the PR template, the model in HACKATHON.md is the one the code uses, no closed or cloud AI and no secrets in the code, and every commit and PR description names the coding agent and the models |
| web | `npm ci` and a type-checked build of the web app |

## Model

The product uses one model: `qwen2.5:7b-instruct` (Apache-2.0), run locally
through Ollama. It extracts the decisions, and with `eval-pep --judge` it also
judges which extracted item matches a PEP's rejected idea. See
[HACKATHON.md](HACKATHON.md) for why we picked it.

## License

The code is MIT. See [LICENSE](LICENSE). The discussion text and quotes in
`examples/` come from public discuss.python.org posts and belong to their
authors; see [examples/README.md](examples/README.md#third-party-content).
