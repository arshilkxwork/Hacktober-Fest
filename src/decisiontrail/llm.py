"""Talk to a local open-weight model through Ollama, with record/replay for tests."""

from __future__ import annotations

import hashlib
import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlsplit

DEFAULT_MODEL = "qwen2.5:7b-instruct"
DEFAULT_HOST = "http://localhost:11434"


class LLMError(RuntimeError):
    pass


def normalize_host(host: str) -> str:
    """Turn any form OLLAMA_HOST takes (a URL, host:port, or a bind address like 0.0.0.0) into a URL."""
    host = host.strip().rstrip("/")
    if "://" not in host:
        host = "http://" + host
    parts = urlsplit(host)
    name = parts.hostname or "127.0.0.1"
    if name == "0.0.0.0":
        name = "127.0.0.1"
    if ":" in name:
        name = f"[{name}]"
    port = parts.port or (11434 if parts.scheme == "http" else None)
    return f"{parts.scheme}://{name}{f':{port}' if port else ''}{parts.path}"


def _key(model: str, system: str, user: str, schema: Dict[str, Any]) -> str:
    blob = json.dumps([model, system, user, schema], sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


class Recording:
    """A JSON file of model responses keyed by the exact request, so runs can be replayed."""

    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.data: Dict[str, Any] = {"responses": {}}
        if self.path.exists():
            self.data = json.loads(self.path.read_text(encoding="utf-8"))

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        entry = self.data["responses"].get(key)
        return None if entry is None else entry["response"]

    def put(self, key: str, model: str, user: str, response: Dict[str, Any]) -> None:
        self.data["responses"][key] = {"model": model, "prompt_head": user[:200], "response": response}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


class OllamaBackend:
    """Calls Ollama's /api/chat with a JSON schema so the model must answer in that shape."""

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        host: str = DEFAULT_HOST,
        num_ctx: int = 8192,
        timeout: int = 900,
        record: Optional[str] = None,
    ) -> None:
        self.model = model
        self.host = normalize_host(host)
        self.num_ctx = num_ctx
        self.timeout = timeout
        self.recording = Recording(record) if record else None

    def complete_json(self, system: str, user: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        key = _key(self.model, system, user, schema)
        if self.recording is not None:
            cached = self.recording.get(key)
            if cached is not None:
                return cached
        payload = {
            "model": self.model,
            "stream": False,
            "format": schema,
            "options": {"temperature": 0, "seed": 7, "num_ctx": self.num_ctx},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        req = urllib.request.Request(
            f"{self.host}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as exc:
            raise LLMError(
                f"Could not reach Ollama at {self.host} ({exc}). Start it with `ollama serve` "
                f"and pull the model with `ollama pull {self.model}`."
            ) from exc
        content = body.get("message", {}).get("content", "")
        try:
            result = json.loads(content)
        except json.JSONDecodeError as exc:
            raise LLMError(f"Model returned invalid JSON: {content[:300]!r}") from exc
        if self.recording is not None:
            self.recording.put(key, self.model, user, result)
        return result


class ReplayBackend:
    """Answers from a recording made by OllamaBackend(record=...). Used by tests and CI."""

    def __init__(self, path: str, model: str = DEFAULT_MODEL) -> None:
        self.model = model
        self.recording = Recording(path)

    def complete_json(self, system: str, user: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        cached = self.recording.get(_key(self.model, system, user, schema))
        if cached is None:
            raise LLMError(f"No recorded response for this request in {self.recording.path}")
        return cached
