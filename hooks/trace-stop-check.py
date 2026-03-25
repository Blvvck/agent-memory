#!/usr/bin/env python3
import json
import sys

from shared.trace_common import resolve_pending, valid_session_id


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return
    session_id = payload.get("session_id", "")
    if not valid_session_id(session_id):
        return
    unresolved = resolve_pending(session_id)
    if not unresolved:
        return
    details = "\n".join(
        f"- {item.get('path')}:{item.get('line', '?')} — {item.get('header', '').strip()}"
        for item in unresolved
    )
    print(json.dumps({
        "continue": True,
        "additionalContext": (
            "AGENT TRACE REMINDER: before ending this turn, complete these note entries "
            "with `↪ trace: ...` or explicitly use `↪ trace: none (new topic)`. "
            "This is a reminder; continue the task after syncing:\n\n"
            f"{details}"
        ),
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)
