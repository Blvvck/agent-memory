#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


SHARED_DIR = Path(__file__).resolve().parent
CODEX_DISPATCH = SHARED_DIR / "codex_hook_dispatch.py"

TOOL_NAMES = {
    "bash": "Bash",
    "edit": "Edit",
    "write": "Write",
    "apply_patch": "apply_patch",
    "patch": "apply_patch",
    "task": "Task",
    "agent": "Agent",
    "spawn_agent": "spawn_agent",
    "webfetch": "WebFetch",
    "websearch": "WebSearch",
    "toolsearch": "ToolSearch",
}


@dataclass
class HookResult:
    blocked: bool = False
    reason: str = ""
    contexts: list[str] = field(default_factory=list)
    raw: dict = field(default_factory=dict)


def _value(payload, *keys):
    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return value
    return None


def _tool_args(payload):
    args = payload.get("args") or payload.get("tool_input") or {}
    return dict(args) if isinstance(args, dict) else {}


def _normalize_args(tool_name, args):
    normalized = dict(args)
    aliases = {
        "filePath": "file_path",
        "oldString": "old_string",
        "newString": "new_string",
        "subagentType": "subagent_type",
        "agentType": "agent_type",
    }
    for source, target in aliases.items():
        if target not in normalized and source in normalized:
            normalized[target] = normalized[source]

    if tool_name == "apply_patch" and "command" not in normalized:
        for key in ("patch", "input", "text"):
            if isinstance(normalized.get(key), str):
                normalized["command"] = normalized[key]
                break

    if tool_name in {"Task", "Agent", "spawn_agent"} and "prompt" not in normalized:
        for key in ("instructions", "task", "description"):
            if isinstance(normalized.get(key), str) and normalized[key].strip():
                normalized["prompt"] = normalized[key]
                break
    return normalized


def normalize_tool_payload(event, payload):
    payload = payload if isinstance(payload, dict) else {}
    raw_tool = str(_value(payload, "tool", "tool_name") or "").strip()
    tool_name = TOOL_NAMES.get(raw_tool.lower(), raw_tool)
    normalized = dict(payload)
    normalized.update(
        {
            "hook_event_name": event,
            "tool_name": tool_name,
            "tool_input": _normalize_args(tool_name, _tool_args(payload)),
            "session_id": _value(payload, "session_id", "sessionID", "id"),
            "cwd": _value(payload, "cwd", "directory") or os.getcwd(),
        }
    )
    return normalized


def parse_hook_result(raw_output):
    result = {}
    for line in reversed(str(raw_output or "").splitlines()):
        try:
            candidate = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(candidate, dict):
            result = candidate
            break

    contexts = []
    blocks = []
    nested = result.get("hookSpecificOutput")
    if isinstance(nested, dict):
        if nested.get("additionalContext"):
            contexts.append(str(nested["additionalContext"]))
        if nested.get("permissionDecision") in {"deny", "ask"}:
            blocks.append(str(nested.get("permissionDecisionReason") or nested["permissionDecision"]))

    if result.get("additionalContext"):
        contexts.append(str(result["additionalContext"]))
    if result.get("systemMessage"):
        contexts.append(str(result["systemMessage"]))

    if result.get("decision") == "block" or result.get("status") == "block":
        blocks.append(str(result.get("reason") or result.get("message") or "agent hook blocked this action."))

    return HookResult(
        blocked=bool(blocks),
        reason="\n\n".join(dict.fromkeys(blocks)),
        contexts=list(dict.fromkeys(contexts)),
        raw=result,
    )


def dispatch_hook(hook_event, payload):
    normalized = normalize_tool_payload(hook_event, payload)
    environment = os.environ.copy()
    environment["AGENT_HOOK_SOURCE"] = "opencode"
    completed = subprocess.run(
        [sys.executable, str(CODEX_DISPATCH)],
        input=json.dumps(normalized, ensure_ascii=True).encode("utf-8"),
        capture_output=True,
        cwd=normalized["cwd"] if Path(normalized["cwd"]).is_dir() else None,
        env=environment,
        timeout=20,
    )
    return parse_hook_result(completed.stdout.decode("utf-8", "replace"))


def dispatch_tool(event, payload):
    return dispatch_hook(event, payload)
