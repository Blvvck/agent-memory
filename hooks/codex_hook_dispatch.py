#!/usr/bin/env python3
"""Adapt Codex hook payloads and outputs to the existing agent hook scripts."""

import json
import os
import re
import subprocess
import sys
from pathlib import Path


SHARED_DIR = Path(__file__).resolve().parent
LEGACY_DIR = SHARED_DIR.parent
LEGACY_HOOKS = {
    "pattern": LEGACY_DIR / "pattern-check.py",
    "source": LEGACY_DIR / "source-citation.py",
    "reversal": LEGACY_DIR / "reversal-check.py",
    "lint": LEGACY_DIR / "lint-check.py",
    "cache": LEGACY_DIR / "cache-session-id.py",
    "brain": LEGACY_DIR / "brain-sync.py",
    "thinking": LEGACY_DIR / "thinking-reminder.py",
    "trace_intent": LEGACY_DIR / "trace-write-intent.py",
    "trace_stop": LEGACY_DIR / "trace-stop-check.py",
    "spawn": LEGACY_DIR / "agent-spawn-check.py",
    "persona": LEGACY_DIR / "agent-persona-check.py",
}
PATCH_FILE_RE = re.compile(r"^\*\*\* (Update|Add|Delete) File: (.+?)\s*$", re.MULTILINE)


def read_payload():
    try:
        value = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return {}
    return value if isinstance(value, dict) else {}


def patch_files(payload):
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return []

    patch = tool_input.get("command") or tool_input.get("patch") or ""
    if not isinstance(patch, str):
        return []

    files = []
    cwd = Path(
        tool_input.get("workdir")
        or tool_input.get("cwd")
        or payload.get("cwd")
        or os.getcwd()
    )
    for operation, raw_path in PATCH_FILE_RE.findall(patch):
        path = Path(raw_path.strip())
        if not path.is_absolute():
            path = cwd / path
        path = path.resolve()
        entry = (str(path), "Write" if operation == "Add" else "Edit")
        if entry not in files:
            files.append(entry)
    return files


def synthetic_file_payload(payload, file_path, tool_name):
    synthetic = dict(payload)
    synthetic["tool_name"] = tool_name
    original_input = payload.get("tool_input") or {}
    synthetic["tool_input"] = {
        "file_path": file_path,
        "workdir": original_input.get("workdir") or original_input.get("cwd") or payload.get("cwd"),
    }
    return synthetic


def run_legacy(name, payload):
    script = LEGACY_HOOKS[name]
    if not script.exists():
        return None

    cwd = payload.get("cwd")
    command = [sys.executable, str(script)]
    try:
        completed = subprocess.run(
            command,
            input=json.dumps(payload, ensure_ascii=True).encode("utf-8"),
            capture_output=True,
            cwd=cwd if cwd and Path(cwd).is_dir() else None,
            timeout=20,
        )
    except (OSError, subprocess.SubprocessError) as error:
        sys.stderr.write(f"[codex-hook] {name} failed to start: {error}\n")
        return None

    if completed.stderr:
        sys.stderr.buffer.write(completed.stderr)
    if completed.returncode != 0 or not completed.stdout.strip():
        return None

    lines = [line.strip() for line in completed.stdout.decode("utf-8", "replace").splitlines() if line.strip()]
    for line in reversed(lines):
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    return None


def collect_result(result, blocks, contexts):
    if not result:
        return

    hook_output = result.get("hookSpecificOutput")
    if isinstance(hook_output, dict):
        nested = hook_output.get("additionalContext")
        if nested:
            contexts.append(str(nested))
        decision = hook_output.get("permissionDecision")
        if decision in {"deny", "ask"}:
            blocks.append(str(hook_output.get("permissionDecisionReason") or decision))

    status = result.get("status")
    decision = result.get("decision")
    if status == "block" or decision == "block":
        blocks.append(str(result.get("reason") or result.get("message") or "Hook blocked this action."))

    additional_context = result.get("additionalContext")
    if additional_context:
        contexts.append(str(additional_context))


def emit_result(event, blocks, contexts):
    if blocks:
        reason = "\n\n".join(dict.fromkeys(blocks))
        if event in {"PreToolUse", "PostToolUse", "PostToolUseFailure", "Stop", "SubagentStop", "UserPromptSubmit"}:
            print(json.dumps({"decision": "block", "reason": reason}))
            return
        if event in {"PreCompact", "PostCompact"}:
            print(json.dumps({"continue": False, "stopReason": reason}))
            return
        print(json.dumps({
            "systemMessage": reason,
        }))
        return

    if contexts:
        if event not in {"PreToolUse", "PostToolUse", "PostToolUseFailure"}:
            print(json.dumps({"systemMessage": "\n\n".join(dict.fromkeys(contexts))}))
            return
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": event,
                "additionalContext": "\n\n".join(dict.fromkeys(contexts)),
            }
        }))


def log_invocation(payload, event):
    try:
        sys.path.insert(0, str(SHARED_DIR))
        from common import append_event, update_current_session

        source = os.environ.get("AGENT_HOOK_SOURCE", "codex")
        session_id = payload.get("session_id")
        update_current_session(
            source,
            session_id=session_id,
            event=event,
            cwd=payload.get("cwd"),
            extra={"tool_name": payload.get("tool_name")},
        )
        append_event({
            "source": source,
            "type": "hook_invocation",
            "event": event,
            "session_id": session_id,
            "cwd": payload.get("cwd"),
            "tool_name": payload.get("tool_name"),
        })
    except Exception as error:
        sys.stderr.write(f"[codex-hook] event logging skipped: {error}\n")


def main():
    payload = read_payload()
    event = payload.get("hook_event_name", "")
    tool_name = payload.get("tool_name", "")
    if not event:
        return

    log_invocation(payload, event)
    blocks = []
    contexts = []

    if event == "PreToolUse":
        sys.path.insert(0, str(SHARED_DIR))
        from protected_log_guard import guard_payload

        reason = guard_payload(payload)
        if reason:
            blocks.append(reason)

    if event == "PreToolUse" and tool_name == "Bash":
        for name in ("pattern", "source", "reversal", "lint"):
            collect_result(run_legacy(name, payload), blocks, contexts)
    elif event == "PreToolUse" and tool_name in {"Read", "Write", "Edit", "Grep", "Glob"}:
        collect_result(run_legacy("pattern", payload), blocks, contexts)
        if tool_name in {"Write", "Edit"}:
            collect_result(run_legacy("trace_intent", payload), blocks, contexts)
    elif event == "PreToolUse" and tool_name == "apply_patch":
        collect_result(run_legacy("trace_intent", payload), blocks, contexts)
        for file_path, synthetic_tool in patch_files(payload):
            collect_result(
                run_legacy("pattern", synthetic_file_payload(payload, file_path, synthetic_tool)),
                blocks,
                contexts,
            )
    elif event == "PreToolUse" and tool_name in {"Agent", "spawn_agent", "Task"}:
        collect_result(run_legacy("spawn", payload), blocks, contexts)
    elif event == "PostToolUse" and tool_name in {
        "Bash", "apply_patch", "Agent", "Task", "Edit", "Write",
        "WebFetch", "WebSearch", "ToolSearch",
    }:
        for name in ("cache", "brain", "thinking"):
            collect_result(run_legacy(name, payload), blocks, contexts)
        if tool_name in {"Agent", "Task"}:
            collect_result(run_legacy("persona", payload), blocks, contexts)
        if tool_name in {"Edit", "Write", "apply_patch"}:
            if tool_name in {"Edit", "Write"}:
                collect_result(run_legacy("lint", payload), blocks, contexts)
            else:
                for file_path, synthetic_tool in patch_files(payload):
                    collect_result(
                        run_legacy("lint", synthetic_file_payload(payload, file_path, synthetic_tool)),
                        blocks,
                        contexts,
                    )
    elif event in {"PreCompact", "Stop", "SessionEnd"}:
        collect_result(run_legacy("brain", payload), blocks, contexts)
        if event == "Stop":
            collect_result(run_legacy("trace_stop", payload), blocks, contexts)

    emit_result(event, blocks, contexts)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        sys.stderr.write(f"[codex-hook] dispatcher failed open: {error}\n")
