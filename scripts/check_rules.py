"""Check the repository against the Hack Day rules that a script can check.

Run from the repository root: python scripts/check_rules.py
In GitHub Actions it also reads the event, so on a pull request it checks the
PR description and every commit in the PR, and on a push every pushed commit.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parent.parent

# Closed or cloud AI that would score 0 for open-source AI use.
CLOUD_AI = re.compile(
    r"\b(import|from)\s+(openai|anthropic|google\.generativeai|google\.genai|groq|cohere|mistralai|together)\b"
    r"|api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.groq\.com"
    r"|openrouter\.ai|api\.together\.(ai|xyz)|api-inference\.huggingface\.co|api\.mistral\.ai"
    r"|[\"'](openai|@anthropic-ai/sdk|@google/generative-ai|groq-sdk|cohere-ai)[\"']",
    re.I,
)
SECRET = re.compile(
    r"ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35}"
    r"|hf_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----"
)
TEMPLATE = ["## What this PR does", "## Models the product uses in this PR",
            "## AI coding assistants that helped write it", "## How we tested it"]
COMMIT_LINES = ("Coding agent:", "Models used in project:")


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(encoding="utf-8") if p.exists() else ""


def section(markdown: str, heading: str) -> str:
    """Text under a "## heading", without HTML comments."""
    m = re.search(rf"^{re.escape(heading)}\s*$(.*?)(?=^## |\Z)", markdown, re.M | re.S)
    return re.sub(r"<!--.*?-->", "", m.group(1), flags=re.S).strip() if m else ""


def check_repo() -> List[str]:
    errors = []
    hackathon = read("HACKATHON.md")
    for needed in ("Team name", "Problem", "Models", "Ayan Alam", "Bhavya Nayal", "Vaidik Garg", "Arshil Khan"):
        if needed.lower() not in hackathon.lower():
            errors.append(f"HACKATHON.md does not mention {needed!r}")
    m = re.search(r'DEFAULT_MODEL = "([^"]+)"', read("src/decisiontrail/llm.py"))
    if not m:
        errors.append("could not find DEFAULT_MODEL in src/decisiontrail/llm.py")
    elif m.group(1) not in hackathon:
        errors.append(f"the model the code uses ({m.group(1)}) is not named in HACKATHON.md")
    if not read("LICENSE").startswith("MIT License"):
        errors.append("LICENSE is not the MIT license")
    template = read(".github/pull_request_template.md")
    errors += [f"the PR template is missing {h!r}" for h in TEMPLATE if h not in template]
    if ".env" not in read(".gitignore").split():
        errors.append(".env is not in .gitignore")

    for path in git("ls-files").splitlines():
        if path.startswith("examples/") or path.endswith((".lock", "package-lock.json")):
            continue  # recorded third-party text and lockfiles, not our code
        try:
            text = (ROOT / path).read_text(encoding="utf-8")
        except (UnicodeDecodeError, FileNotFoundError):
            continue
        if path != "scripts/check_rules.py" and path.endswith((".py", ".ts", ".tsx", ".js", ".json", ".toml", ".yml")):
            for n, line in enumerate(text.splitlines(), 1):
                if CLOUD_AI.search(line):
                    errors.append(f"{path}:{n}: closed or cloud AI reference: {line.strip()[:100]}")
        if path != "scripts/check_rules.py" and SECRET.search(text):
            errors.append(f"{path}: looks like it contains a secret or token")
    return errors


def check_commits(rev_range: str) -> List[str]:
    errors = []
    for sha in git("rev-list", rev_range).split():
        message = git("log", "-1", "--format=%B", sha)
        missing = [line for line in COMMIT_LINES if not re.search(rf"^{re.escape(line)} \S", message, re.M)]
        if missing:
            errors.append(f"commit {sha[:7]} ({message.splitlines()[0][:60]}) does not name {' / '.join(missing)}")
    return errors


def check_event() -> List[str]:
    path = os.environ.get("GITHUB_EVENT_PATH")
    if not path or not Path(path).exists():
        return []
    event = json.loads(Path(path).read_text(encoding="utf-8"))
    errors = []
    if "pull_request" in event:
        pr = event["pull_request"]
        body = pr.get("body") or ""
        for heading in TEMPLATE:
            if not section(body, heading):
                errors.append(f"the PR description leaves {heading!r} empty")
        errors += check_commits(f"{pr['base']['sha']}..{pr['head']['sha']}")
    elif event.get("before") and event.get("after") and set(event["before"]) != {"0"}:
        errors += check_commits(f"{event['before']}..{event['after']}")
    return errors


def main() -> int:
    errors = check_repo() + check_event()
    for e in errors:
        print(f"::error::{e}")
    if not errors:
        print("All rule checks passed.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
