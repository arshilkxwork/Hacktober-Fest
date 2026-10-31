# HACKATHON.md

## Team

- **Team name:** 404-Error
- **Members:**
  - Arshil Khan (team leader)
  - Ayan Alam
  - Bhavya Nayal
  - Vaidik Garg

## Problem statement

**Problem 06: Open Source Decision Intelligence and Knowledge Recovery**

We are building **DecisionTrail**, a tool that reads public project discussions
(GitHub issues and pull requests, and discuss.python.org threads), pulls out the
technical decisions made in them along with the reasoning and the alternatives
that were rejected, links each decision to the source code it is about, and
brings those decisions up again when a new pull request touches that code.
Every extracted decision keeps a quote and a link back to the post it came
from, so a maintainer can check it.

## AI models used

| Model | Runs on | What it does in the product | Why we picked it |
|---|---|---|---|
| `qwen2.5:7b-instruct` (Qwen 2.5, 7B, Apache-2.0) | Ollama on our laptop (Apple M5, 16 GB) | Reads each chunk of a discussion and returns the decisions, rejected alternatives and reasons as JSON, with the post IDs and quotes that support them. With `eval-pep --judge` it also decides which extracted item matches each of a PEP's rejected ideas and whether the reason agrees | Open-weight and Apache-2.0 licensed. It follows JSON schemas reliably, handles long technical English well, and the 7B quantised build fits comfortably in 16 GB of RAM next to the rest of the tool |

No closed or cloud AI APIs are used by the product. The automated tests in CI do
not call a model (the CI runner has no model); they run the same pipeline against
a recorded model response so the parsing, grounding and linking code is tested
deterministically.
