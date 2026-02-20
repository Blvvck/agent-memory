import hashlib
import json
import os
import re
import tempfile
from pathlib import Path


STATE_DIR = Path.home() / ".agent-memory" / "hooks" / "shared" / "state" / "trace-pending"
ENTRY_HEADER_RE = re.compile(
    r"^\s*(?:[-*]\s*)?\[(?P<timestamp>\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\](?P<rest>.*)$",
    re.MULTILINE,
)
TRACE_LINE_RE = re.compile(r"^\s*(?:[-*]\s*)?↪\s*trace:\s*(?P<value>.+?)\s*$", re.IGNORECASE | re.MULTILINE)
INVALID_TRACE_VALUES = {"todo", "tbd", "pending", "add later", "placeholder"}


def valid_session_id(session_id):
    value = str(session_id or "").strip()
    lower = value.lower()
    if not value or lower in {"unknown", "current"}:
        return False
    return not any(fragment in lower for fragment in ("test-session", "codex-test", "placeholder", "dummy"))


def session_variants(session_id):
    value = str(session_id or "").strip()
    variants = {value}
    if value:
        raw = value.rsplit(":", 1)[-1]
        for candidate in {value, raw}:
            short = candidate[:8]
            variants.update({candidate, short, f"mac:{short}", f"omen:{short}"})
            for cli in ("claude", "codex", "agy", "antigravity", "opencode"):
                variants.update({
                    f"{cli}:{short}",
                    f"mac:{cli}:{short}",
                    f"omen:{cli}:{short}",
                    f"{cli}:{candidate}",
                    f"mac:{cli}:{candidate}",
                    f"omen:{cli}:{candidate}",
                })
    return {variant for variant in variants if variant}


def extract_entries(text):
    if not isinstance(text, str):
        return []
    matches = list(ENTRY_HEADER_RE.finditer(text))
    entries = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        entries.append({
            "header": match.group(0).strip(),
            "body": text[match.end():end],
            "line": text[:match.start()].count("\n") + 1,
            "timestamp": match.group("timestamp"),
        })
    return entries


def entry_matches_session(entry, session_id):
    header = entry.get("header", "")
    return any(f"[session:{variant}]" in header for variant in session_variants(session_id))


def entry_is_substantive(entry):
    lines = []
    for line in entry.get("body", "").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("```"):
            continue
        if stripped.startswith("↪") or stripped.lower().startswith("trace:"):
            continue
        lines.append(stripped)
    return len(lines) >= 2


def entry_has_trace(entry):
    for match in TRACE_LINE_RE.finditer(entry.get("body", "")):
        value = match.group("value").strip().lower()
        if value == "none (new topic)":
            return True
        if value in INVALID_TRACE_VALUES or len(value) < 4:
            continue
        return True
    return False


def missing_trace_entries(text, session_id):
    missing = []
    for entry in extract_entries(text):
        if not entry_matches_session(entry, session_id):
            continue
        if entry_is_substantive(entry) and not entry_has_trace(entry):
            missing.append(entry)
    return missing


def state_path(session_id):
    digest = hashlib.sha256(str(session_id).encode("utf-8")).hexdigest()[:32]
    return STATE_DIR / f"{digest}.json"


def read_pending(session_id):
    try:
        payload = json.loads(state_path(session_id).read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return []
    return payload if isinstance(payload, list) else []


def write_pending(session_id, entries):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    path = state_path(session_id)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=".tmp", dir=STATE_DIR)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(entries, handle, ensure_ascii=True, indent=2)
            handle.write("\n")
        os.replace(temp_name, path)
    finally:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass


def add_pending(session_id, path, entries):
    pending = read_pending(session_id)
    existing = {(item.get("path"), item.get("header")) for item in pending}
    added = []
    for entry in entries:
        key = (str(path), entry.get("header"))
        if key in existing:
            continue
        item = {
            "path": str(path),
            "header": entry.get("header", ""),
            "line": entry.get("line"),
        }
        pending.append(item)
        existing.add(key)
        added.append(item)
    if added:
        write_pending(session_id, pending)
    return added


def resolve_pending(session_id):
    pending = read_pending(session_id)
    unresolved = []
    for item in pending:
        try:
            text = Path(item["path"]).read_text(encoding="utf-8")
        except (KeyError, OSError, UnicodeDecodeError):
            continue
        match = next((entry for entry in extract_entries(text) if entry.get("header") == item.get("header")), None)
        if match and entry_is_substantive(match) and not entry_has_trace(match):
            unresolved.append({**item, "line": match.get("line")})
    if unresolved:
        write_pending(session_id, unresolved)
    else:
        try:
            state_path(session_id).unlink()
        except FileNotFoundError:
            pass
    return unresolved
