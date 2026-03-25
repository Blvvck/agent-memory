#!/usr/bin/env python3
import os
import sys

from common import append_event, parse_json_bytes, read_stdin_bytes, resolve_codex_session_id, run_pipeline, update_current_session


def main():
    raw_stdin = read_stdin_bytes()
    payload = parse_json_bytes(raw_stdin)
    if payload is None:
        payload = {
            "argv": sys.argv[1:],
            "raw": raw_stdin.decode("utf-8", errors="replace"),
        }

    session_id = payload.get("session_id") or resolve_codex_session_id()
    event_name = payload.get("event") or payload.get("type") or "turn_complete"
    update_current_session(
        "codex",
        session_id=session_id,
        event=event_name,
        cwd=os.getcwd(),
        active=True,
        extra={
            "turn_id": payload.get("turn_id"),
            "title": payload.get("title"),
        },
    )
    append_event(
        {
            "source": "codex",
            "type": "notify",
            "event": event_name,
            "title": payload.get("title"),
            "message": payload.get("message"),
            "session_id": session_id,
            "turn_id": payload.get("turn_id"),
        }
    )

    run_pipeline("turn_complete", payload, "codex", strict=False)
    sys.exit(0)


if __name__ == "__main__":
    main()
