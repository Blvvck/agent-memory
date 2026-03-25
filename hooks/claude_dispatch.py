#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from common import append_event, parse_json_bytes, read_stdin_bytes, run_pipeline, update_current_session
from protected_log_guard import guard_payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--legacy-script", required=True)
    args = parser.parse_args()

    raw_stdin = read_stdin_bytes()
    payload = parse_json_bytes(raw_stdin) or {}
    start = time.time()
    session_id = payload.get("session_id")

    update_current_session(
        "claude",
        session_id=session_id,
        event=args.event,
        cwd=payload.get("cwd"),
        extra={
            "hook_name": args.name,
            "tool_name": payload.get("tool_name"),
        },
    )

    append_event(
        {
            "source": "claude",
            "type": "hook_start",
            "event": args.event,
            "hook_name": args.name,
            "legacy_script": args.legacy_script,
            "session_id": session_id,
            "cwd": payload.get("cwd"),
            "tool_name": payload.get("tool_name"),
        }
    )

    if args.event == "claude_pre_tool":
        payload["hook_event_name"] = "PreToolUse"
        reason = guard_payload(payload)
        if reason:
            print(json.dumps({"decision": "block", "reason": reason}))
            sys.exit(2)

    pipeline_code = run_pipeline(args.event, payload or {"raw": raw_stdin.decode("utf-8", errors="replace")}, "claude", strict=True)
    if pipeline_code != 0:
        append_event(
            {
                "source": "claude",
                "type": "hook_end",
                "event": args.event,
                "hook_name": args.name,
                "legacy_script": args.legacy_script,
                "returncode": pipeline_code,
                "duration_ms": round((time.time() - start) * 1000),
                "stage": "shared_pipeline",
            }
        )
        sys.exit(pipeline_code)

    legacy_path = Path(args.legacy_script)
    if not legacy_path.exists():
        append_event(
            {
                "source": "claude",
                "type": "hook_end",
                "event": args.event,
                "hook_name": args.name,
                "legacy_script": args.legacy_script,
                "returncode": 0,
                "duration_ms": round((time.time() - start) * 1000),
                "stage": "missing_legacy",
            }
        )
        return

    completed = subprocess.run([sys.executable, str(legacy_path)], input=raw_stdin, capture_output=True)
    if completed.stdout:
        sys.stdout.buffer.write(completed.stdout)
    if completed.stderr:
        sys.stderr.buffer.write(completed.stderr)

    append_event(
        {
            "source": "claude",
            "type": "hook_end",
            "event": args.event,
            "hook_name": args.name,
            "legacy_script": args.legacy_script,
            "returncode": completed.returncode,
            "duration_ms": round((time.time() - start) * 1000),
            "stage": "legacy",
        }
    )
    sys.exit(completed.returncode)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback
        crash_log = Path(tempfile.gettempdir()) / "claude-hook-crash.log"
        with open(crash_log, "a") as f:
            f.write(f"=== {datetime.now(timezone.utc).isoformat()} ===\n")
            f.write(f"sys.path[0]: {sys.path[0]}\n")
            f.write(f"cwd: {os.getcwd()}\n")
            f.write(f"args: {sys.argv}\n")
            traceback.print_exc(file=f)
            f.write("\n")
        sys.exit(0)
