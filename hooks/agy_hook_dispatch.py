#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

SHARED_DIR = Path(__file__).resolve().parent
CODEX_DISPATCH = SHARED_DIR / "codex_hook_dispatch.py"

try:
    from agent_spawn_check import check_spawn_requirements
except ImportError:
    check_spawn_requirements = None

TOOL_MAPPINGS = {
    "run_command": "Bash",
    "write_to_file": "Write",
    "replace_file_content": "Edit",
    "view_file": "Read",
    "grep_search": "Grep",
    "find_by_name": "Glob",
    "invoke_subagent": "Agent",
}


def read_stdin():
    try:
        raw = sys.stdin.read()
        if not raw or not raw.strip():
            return {}
        return json.loads(raw)
    except Exception:
        return {}


def normalize_args(tool_name, raw_args):
    args = dict(raw_args) if isinstance(raw_args, dict) else {}
    normalized = {}

    if tool_name == "Bash":
        normalized["command"] = args.get("CommandLine", "")
        if "Cwd" in args:
            normalized["workdir"] = args["Cwd"]
            normalized["cwd"] = args["Cwd"]
    elif tool_name == "Write":
        normalized["file_path"] = args.get("TargetFile", "")
        normalized["content"] = args.get("CodeContent", "")
    elif tool_name == "Edit":
        normalized["file_path"] = args.get("TargetFile", "")
        normalized["old_string"] = args.get("TargetContent", "")
        normalized["new_string"] = args.get("ReplacementContent", "")
    elif tool_name == "Read":
        normalized["file_path"] = args.get("AbsolutePath", "")
    elif tool_name == "Grep":
        normalized["path"] = args.get("SearchPath", "")
        normalized["query"] = args.get("Query", "")
    elif tool_name == "Glob":
        normalized["path"] = args.get("SearchDirectory", "")
        normalized["pattern"] = args.get("Pattern", "")
    elif tool_name == "Agent":
        subagents = args.get("Subagents", [])
        prompts = [s.get("Prompt", "") for s in subagents if isinstance(s, dict) and s.get("Prompt")]
        normalized["prompt"] = "\n\n".join(prompts)
        types = [s.get("TypeName") or s.get("Role") or "" for s in subagents if isinstance(s, dict)]
        normalized["subagent_type"] = types[0] if types else "general-purpose"
        normalized["subagents"] = subagents
    else:
        normalized = args

    return normalized


def check_subagents_spawn(args):
    if not check_spawn_requirements:
        return []
    subagents = args.get("Subagents", []) if isinstance(args, dict) else []
    violations = []
    for sub in subagents:
        if not isinstance(sub, dict):
            continue
        agent_type = sub.get("TypeName") or sub.get("Role") or ""
        prompt = sub.get("Prompt", "")
        sub_violations = check_spawn_requirements(agent_type, prompt)
        violations.extend(sub_violations)
    return violations


def dispatch_to_codex(event, synthetic_payload):
    env = os.environ.copy()
    env["AGENT_HOOK_SOURCE"] = "antigravity"
    cwd = synthetic_payload.get("cwd") or os.getcwd()
    try:
        completed = subprocess.run(
            [sys.executable, str(CODEX_DISPATCH)],
            input=json.dumps(synthetic_payload, ensure_ascii=True).encode("utf-8"),
            capture_output=True,
            cwd=cwd if Path(cwd).is_dir() else None,
            env=env,
            timeout=25,
        )
    except Exception as error:
        sys.stderr.write(f"[agy-hook] dispatch failed: {error}\n")
        return {"decision": "allow", "blocks": [], "contexts": []}

    output = completed.stdout.decode("utf-8", "replace").strip()
    blocks = []
    contexts = []
    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(data, dict):
            continue
        if data.get("decision") in {"block", "deny"}:
            blocks.append(data.get("reason", "Action blocked by agent hook."))
        if data.get("systemMessage"):
            contexts.append(data["systemMessage"])
        nested = data.get("hookSpecificOutput")
        if isinstance(nested, dict) and nested.get("additionalContext"):
            contexts.append(nested["additionalContext"])

    return {
        "blocked": bool(blocks),
        "reason": "\n\n".join(dict.fromkeys(blocks)),
        "contexts": list(dict.fromkeys(contexts)),
    }


def main():
    parser = argparse.ArgumentParser(description="Antigravity Hook Dispatcher")
    parser.add_argument("--event", default="", help="Lifecycle event name")
    cli_args, _ = parser.parse_known_args()

    payload = read_stdin()
    event = cli_args.event or payload.get("hook_event_name") or ""
    if not event:
        if "toolCall" in payload:
            event = "PostToolUse" if "error" in payload or payload.get("stepIdx", 0) > 0 else "PreToolUse"
        elif "executionNum" in payload or "terminationReason" in payload:
            event = "Stop"
        elif "invocationNum" in payload:
            event = "PreInvocation"

    tool_call = payload.get("toolCall") or {}
    raw_tool_name = tool_call.get("name", "")
    raw_tool_args = tool_call.get("args") or {}
    tool_name = TOOL_MAPPINGS.get(raw_tool_name, raw_tool_name)

    session_id = payload.get("conversationId") or payload.get("sessionId") or ""
    workspace_paths = payload.get("workspacePaths") or []
    cwd = raw_tool_args.get("Cwd") or (workspace_paths[0] if workspace_paths else os.getcwd())

    if event == "PreToolUse" and tool_name == "Agent":
        spawn_violations = check_subagents_spawn(raw_tool_args)
        if spawn_violations:
            print(json.dumps({
                "decision": "deny",
                "reason": "agent Spawn Check Blocked:\n" + "\n\n".join(spawn_violations),
            }))
            return

    synthetic_payload = {
        "hook_event_name": event,
        "tool_name": tool_name,
        "tool_input": normalize_args(tool_name, raw_tool_args),
        "session_id": session_id,
        "cwd": cwd,
    }

    result = dispatch_to_codex(event, synthetic_payload)

    if event == "PreToolUse":
        if result.get("blocked"):
            print(json.dumps({
                "decision": "deny",
                "reason": result.get("reason") or "Action blocked by agent policy.",
            }))
        else:
            print(json.dumps({"decision": "allow"}))
    elif event == "PostToolUse":
        print(json.dumps({}))
    elif event == "Stop":
        if result.get("blocked"):
            print(json.dumps({
                "decision": "continue",
                "reason": result.get("reason"),
            }))
        elif result.get("contexts"):
            reminder = "\n\n".join(result["contexts"])
            if "REMINDER" in reminder or "trace" in reminder.lower():
                print(json.dumps({
                    "decision": "continue",
                    "reason": reminder,
                }))
            else:
                print(json.dumps({"decision": "stop"}))
        else:
            print(json.dumps({"decision": "stop"}))
    elif event == "PreInvocation":
        contexts = list(result.get("contexts") or [])
        if session_id:
            raw_id = session_id.rsplit(":", 1)[-1]
            short_id = raw_id[:8]
            contexts.append(
                f"[agent Runtime] Active Harness: agy | Session: agy:{short_id} | Mandatory log format: [session:agy:{short_id}]"
            )
        if contexts:
            steps = [{"ephemeralMessage": msg} for msg in contexts]
            print(json.dumps({"injectSteps": steps}))
        else:
            print(json.dumps({"injectSteps": []}))
    else:
        print(json.dumps({}))


if __name__ == "__main__":
    main()
