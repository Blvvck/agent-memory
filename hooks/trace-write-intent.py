#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

from shared.trace_common import add_pending, entry_has_trace, entry_is_substantive, extract_entries, missing_trace_entries, valid_session_id


PATCH_FILE_RE = re.compile(r"^\*\*\* (Update|Add|Delete) File: (.+?)\s*$", re.MULTILINE)


def tracked_note(path):
    normalized = str(Path(path).expanduser())
    if not normalized.endswith(".md"):
        return False
    if "/agents/" in normalized and "/brain/" in normalized and "/archive/" not in normalized:
        return True
    if normalized.endswith("/ACTIVITY.md") and "/.agent-memory/" in normalized:
        return True
    return normalized.endswith("/core/portfolio.md")


def patch_sections(command, cwd):
    matches = list(PATCH_FILE_RE.finditer(command or ""))
    sections = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(command)
        raw_path = Path(match.group(2).strip())
        path = raw_path if raw_path.is_absolute() else Path(cwd) / raw_path
        lines = []
        for line in command[match.end():end].splitlines():
            if line.startswith("+"):
                lines.append(line[1:])
            elif line.startswith(" "):
                lines.append(line[1:])
        sections.append((path.resolve(), "\n".join(lines)))
    return sections


def write_candidates(payload):
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return []
    if tool_name == "apply_patch":
        return patch_sections(tool_input.get("command", ""), payload.get("cwd") or ".")
    path = tool_input.get("file_path", "")
    written = tool_input.get("new_string", "") or tool_input.get("content", "")
    return [(Path(path).expanduser().resolve(), written)] if path and written else []


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return
    session_id = payload.get("session_id", "")
    if not valid_session_id(session_id):
        return

    added = []
    for path, written in write_candidates(payload):
        if not tracked_note(path):
            continue
        candidates = [
            entry for entry in missing_trace_entries(written, session_id)
            if entry_is_substantive(entry) and not entry_has_trace(entry)
        ]
        if candidates:
            added.extend(add_pending(session_id, path, candidates))

    if not added:
        return
    files = ", ".join(sorted({item["path"] for item in added}))
    print(json.dumps({
        "continue": True,
        "additionalContext": (
            "TRACE REMINDER: this agent note entry is being tracked until it has a trace. "
            "Finish the entry with `↪ trace: ...` or `↪ trace: none (new topic)`. "
            f"Pending file(s): {files}"
        ),
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)
