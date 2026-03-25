#!/usr/bin/env python3
import argparse
import contextlib
import io
import json
import os
import re
import sys

from common import (
    STATE_DIR,
    append_event,
    parse_json_bytes,
    read_stdin_bytes,
    run_pipeline,
    update_current_session,
)
from opencode_adapter import HookResult, dispatch_hook, normalize_tool_payload, parse_hook_result


def pick_session_id(payload):
    if not isinstance(payload, dict):
        return None
    return (
        payload.get("session_id")
        or payload.get("sessionID")
        or payload.get("id")
        or (payload.get("info") or {}).get("id")
        or (payload.get("properties") or {}).get("sessionID")
        or ((payload.get("properties") or {}).get("info") or {}).get("id")
    )


def pick_cwd(payload):
    if not isinstance(payload, dict):
        return os.getcwd()
    return (
        payload.get("cwd")
        or payload.get("directory")
        or (payload.get("info") or {}).get("directory")
        or (payload.get("properties") or {}).get("cwd")
        or ((payload.get("properties") or {}).get("info") or {}).get("directory")
        or os.getcwd()
    )


def summarize_payload(payload):
    if not isinstance(payload, dict):
        return {}

    info = payload.get("info") or {}
    properties = payload.get("properties") or {}
    property_info = properties.get("info") or {}
    return {
        "agent": payload.get("agent") or properties.get("agent"),
        "tool_name": payload.get("tool") or properties.get("tool"),
        "call_id": payload.get("callID")
        or payload.get("call_id")
        or properties.get("callID"),
        "message_id": payload.get("messageID")
        or payload.get("message_id")
        or properties.get("messageID"),
        "command_name": payload.get("name") or properties.get("name"),
        "permission": payload.get("permission") or properties.get("permission"),
        "request_id": payload.get("requestID")
        or payload.get("request_id")
        or properties.get("requestID"),
        "reply": payload.get("reply") or properties.get("reply"),
        "title": info.get("title") or property_info.get("title"),
        "session_slug": info.get("slug") or property_info.get("slug"),
    }


def transcript_file(session_id):
    if not session_id:
        return None
    safe_id = re.sub(r"[^A-Za-z0-9_.-]", "_", str(session_id))
    directory = STATE_DIR / "opencode-transcripts"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f"{safe_id}.jsonl"


def append_transcript(event_name, payload):
    path = transcript_file(pick_session_id(payload))
    if path is None:
        return None

    record = None
    if event_name == "chat_message":
        message = payload.get("message")
        if isinstance(message, dict):
            message = dict(message)
            if not message.get("content") and payload.get("parts"):
                message["content"] = payload["parts"]
            record = {"message": message}
        else:
            parts = payload.get("parts") or []
            record = {"message": {"role": "user", "content": parts}}
    elif event_name == "tool_execute_before":
        normalized = normalize_tool_payload("PreToolUse", payload)
        record = {
            "message": {
                "role": "assistant",
                "content": [{
                    "type": "tool_use",
                    "name": normalized["tool_name"],
                    "input": normalized["tool_input"],
                }],
            }
        }

    if record is None:
        return path

    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=True) + "\n")
    return path


def run_pipeline_result(event_name, payload):
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        run_pipeline(event_name, payload, "opencode", strict=False)
    return parse_hook_result(output.getvalue())


def merge_results(*results):
    merged = HookResult()
    for result in results:
        if result is None:
            continue
        merged.blocked = merged.blocked or result.blocked
        if result.reason:
            merged.reason = "\n\n".join(dict.fromkeys(filter(None, (merged.reason, result.reason))))
        merged.contexts.extend(result.contexts)
        if result.raw:
            merged.raw = result.raw
    merged.contexts = list(dict.fromkeys(merged.contexts))
    return merged


def emit_result(result):
    if not result.blocked and not result.contexts:
        return 0
    print(json.dumps({
        "blocked": result.blocked,
        "reason": result.reason,
        "contexts": result.contexts,
    }))
    return 2 if result.blocked else 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", required=True)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    raw_stdin = read_stdin_bytes()
    payload = parse_json_bytes(raw_stdin)
    if payload is None:
        payload = {
            "argv": sys.argv[1:],
            "raw": raw_stdin.decode("utf-8", errors="replace"),
        }

    session_id = pick_session_id(payload)
    cwd = pick_cwd(payload)
    event_name = args.event
    active = None
    if event_name == "session_start":
        active = True
    elif event_name == "session_end":
        active = False

    transcript_path = append_transcript(event_name, payload)
    if transcript_path:
        payload["transcript_path"] = str(transcript_path)

    extra = summarize_payload(payload)
    extra["transcript_path"] = str(transcript_path) if transcript_path else None

    update_current_session(
        "opencode",
        session_id=session_id,
        event=event_name,
        cwd=cwd,
        active=active,
        extra=extra,
    )
    append_event(
        {
            "source": "opencode",
            "type": "notify",
            "event": event_name,
            "session_id": session_id,
            "cwd": cwd,
            **{key: value for key, value in extra.items() if value is not None},
        }
    )

    result = None
    if event_name == "tool_execute_before":
        result = dispatch_hook("PreToolUse", payload)
    elif event_name == "tool_execute_after":
        result = dispatch_hook("PostToolUse", payload)
    elif event_name == "session_compacting":
        result = dispatch_hook("PreCompact", payload)
    elif event_name == "session_end":
        result = merge_results(
            dispatch_hook("SessionEnd", payload),
            run_pipeline_result("session_end", payload),
        )
    elif event_name == "turn_complete":
        result = run_pipeline_result("turn_complete", payload)
    else:
        result = run_pipeline_result(event_name, payload)

    code = emit_result(result)
    if args.strict and code != 0:
        sys.exit(code)
    sys.exit(code if result.blocked else 0)


if __name__ == "__main__":
    main()
