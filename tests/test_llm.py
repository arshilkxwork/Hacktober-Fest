import io
import json

import pytest

from decisiontrail import llm


def test_record_then_replay(tmp_path, monkeypatch):
    calls = []

    def fake_urlopen(req, timeout):
        payload = json.loads(req.data)
        calls.append(payload)
        assert payload["format"] == {"type": "object"}
        assert payload["options"]["temperature"] == 0
        return io.BytesIO(json.dumps({"message": {"content": '{"ok": true}'}}).encode())

    monkeypatch.setattr(llm.urllib.request, "urlopen", fake_urlopen)
    rec = tmp_path / "rec.json"
    live = llm.OllamaBackend(model="qwen2.5:7b-instruct", record=str(rec))
    assert live.complete_json("sys", "user", {"type": "object"}) == {"ok": True}
    assert live.complete_json("sys", "user", {"type": "object"}) == {"ok": True}
    assert len(calls) == 1  # second call came from the recording

    replay = llm.ReplayBackend(str(rec), model="qwen2.5:7b-instruct")
    assert replay.complete_json("sys", "user", {"type": "object"}) == {"ok": True}
    with pytest.raises(llm.LLMError):
        replay.complete_json("sys", "different prompt", {"type": "object"})


@pytest.mark.parametrize(
    "given, expected",
    [
        ("http://localhost:11434", "http://localhost:11434"),
        ("http://localhost:11434/", "http://localhost:11434"),
        ("127.0.0.1:11434", "http://127.0.0.1:11434"),
        ("0.0.0.0", "http://127.0.0.1:11434"),
        ("0.0.0.0:8080", "http://127.0.0.1:8080"),
        ("https://models.example.org", "https://models.example.org"),
        ("[::1]:11434", "http://[::1]:11434"),
    ],
)
def test_host_forms_from_ollama_host(given, expected):
    assert llm.normalize_host(given) == expected
    assert llm.OllamaBackend(host=given).host == expected


def test_invalid_json_from_model_is_an_error(monkeypatch):
    monkeypatch.setattr(
        llm.urllib.request, "urlopen", lambda req, timeout: io.BytesIO(b'{"message": {"content": "not json"}}')
    )
    with pytest.raises(llm.LLMError):
        llm.OllamaBackend().complete_json("s", "u", {})
