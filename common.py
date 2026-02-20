#!/usr/bin/env python3
import json
import os
import socket
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from collections import deque
from pathlib import Path


ROOT = Path.home() / ".agent-memory" / "hooks" / "shared"
PIPELINE_DIR = ROOT / "pipeline"
STATE_DIR = ROOT / "state"
LEGACY_CLAUDE_CACHE = Path(tempfile.gettempdir()) / "claude-session-id"
CODEX_HISTORY_PATH = Path.home() / ".codex" / "history.jsonl"


def detect_machine():
    hostname = socket.gethostname().lower()
    if "desktop" in hostname or "omen" in hostname:
        return "omen"
    return "mac"


def iso_now():
    return datetime.now(timezone.utc).isoformat()


def event_log_path():
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    return STATE_DIR / f"events-{detect_machine()}.jsonl"


def current_session_path():
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    return STATE_DIR / f"current-session-{detect_machine()}.json"


def append_event(record):
    payload = {"ts": iso_now(), "machine": detect_machine(), **record}
    with event_log_path().open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=True) + "\n")


def read_stdin_bytes():
    try:
        return sys.stdin.buffer.read()
    except Exception:
        return b""


def parse_json_bytes(raw_bytes):
    if not raw_bytes or not raw_bytes.strip():
        return None
    try:
        return json.loads(raw_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def event_key(name):
    return "".join(ch if ch.isalnum() else "_" for ch in name.strip().lower()).strip("_") or "unknown"


def short_session_label(source, session_id):
    if not session_id:
        return None
    short = str(session_id)[:8]
    machine = detect_machine()
    if source in {"claude", "codex"}:
        return f"{machine}:{source}:{short}"
    return f"{machine}:{source}:{short}"


def read_json_file(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return None


def write_json_file(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(json.dumps(payload, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    temp_path.replace(path)


def read_current_session():
    return read_json_file(current_session_path()) or {}


def codex_env_session_id():
    return os.environ.get("CODEX_THREAD_ID") or os.environ.get("CODEX_SESSION_ID")


def resolve_codex_session_id():
    return codex_env_session_id() or latest_codex_history_session_id()


def latest_codex_history_session_id(limit=200):
    if not CODEX_HISTORY_PATH.exists():
        return None

    lines = deque(maxlen=limit)
    try:
        with CODEX_HISTORY_PATH.open(encoding="utf-8") as handle:
            for line in handle:
                lines.append(line)
    except OSError:
        return None

    for line in reversed(lines):
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        session_id = payload.get("session_id")
        if session_id:
            return session_id
    return None


def read_legacy_claude_session():
    cached = read_json_file(LEGACY_CLAUDE_CACHE)
    if cached:
        session_id = cached.get("session_id")
        if session_id:
            return {
                "source": "claude",
                "session_id": session_id,
                "short_session": cached.get("short_session") or short_session_label("claude", session_id),
                "updated_at": cached.get("updated_at"),
                "machine": cached.get("machine") or detect_machine(),
            }

    try:
        raw = LEGACY_CLAUDE_CACHE.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    if raw:
        return {
            "source": "claude",
            "session_id": None,
            "short_session": raw,
            "updated_at": None,
            "machine": detect_machine(),
        }
    return None


def resolve_current_session(preferred_source=None):
    current = read_current_session()
    if current.get("source") and (current.get("session_id") or current.get("short_session")):
        if preferred_source in (None, current.get("source")):
            return current

    if preferred_source in (None, "codex"):
        codex_session = resolve_codex_session_id()
        if codex_session:
            return {
                "source": "codex",
                "session_id": codex_session,
                "short_session": short_session_label("codex", codex_session),
                "updated_at": iso_now(),
                "machine": detect_machine(),
            }

    if preferred_source in (None, "claude"):
        claude_session = read_legacy_claude_session()
        if claude_session:
            return claude_session

    return current or None


def update_current_session(source, session_id=None, event=None, cwd=None, pid=None, active=None, extra=None):
    current = read_current_session()
    source_changed = source != current.get("source")
    payload = {
        **current,
        "machine": detect_machine(),
        "source": source,
        "updated_at": iso_now(),
    }

    if source_changed:
        for stale_key in ("hook_name", "tool_name", "turn_id", "title", "message", "exit_code"):
            payload.pop(stale_key, None)

    if event:
        payload["last_event"] = event
    if cwd:
        payload["cwd"] = cwd
    if pid is not None:
        payload["pid"] = pid
    if active is not None:
        payload["active"] = active

    resolved_session_id = session_id
    if not resolved_session_id and source == "codex":
        resolved_session_id = resolve_codex_session_id()

    if resolved_session_id:
        payload["session_id"] = resolved_session_id
        payload["short_session"] = short_session_label(source, resolved_session_id)
    elif source_changed:
        payload.pop("session_id", None)
        payload.pop("short_session", None)

    if extra:
        for key, value in extra.items():
            if value is None:
                continue
            payload[key] = value

    write_json_file(current_session_path(), payload)
    return payload


def iter_pipeline_scripts(event_name):
    dirs = [PIPELINE_DIR / "all.d", PIPELINE_DIR / f"{event_key(event_name)}.d"]
    for directory in dirs:
        if not directory.is_dir():
            continue
        for path in sorted(directory.iterdir()):
            if path.name.startswith(".") or not path.is_file():
                continue
            if path.suffix not in (".py", ".sh"):
                continue
            yield path


def run_pipeline(event_name, payload, source, strict):
    raw = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    for script in iter_pipeline_scripts(event_name):
        command = [sys.executable, str(script)] if script.suffix == ".py" else [str(script)]
        env = os.environ.copy()
        env["AGENT_HOOK_EVENT"] = event_name
        env["AGENT_HOOK_SOURCE"] = source
        completed = subprocess.run(command, input=raw, capture_output=True, env=env)
        if completed.stdout:
            sys.stdout.buffer.write(completed.stdout)
        if completed.stderr:
            sys.stderr.buffer.write(completed.stderr)
        if completed.returncode != 0:
            append_event(
                {
                    "source": source,
                    "type": "pipeline_error",
                    "event": event_name,
                    "script": str(script),
                    "returncode": completed.returncode,
                }
            )
            if strict:
                return completed.returncode
    return 0
