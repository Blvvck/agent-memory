#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


AGENTS_DIR = Path.home() / ".agent-memory" / "agents"
EXEMPT_TYPES = {"explore", "plan", "claude-code-guide", "statusline-setup"}

# Agent-specific mandatory reads beyond the standard files
# Format: { "agent_name": ["file_path_substring", ...] }
# These are checked in addition to any WAKE.md in the agent's folder
AGENT_REQUIRED_READS = {
    # Agent-specific mandatory reads beyond the standard files.
    # "your-agent": ["extra/file.md", "another/file.md"],
}


def get_wake_requirements(agent_name):
    """Check if agent has WAKE.md and return its required files."""
    wake_file = AGENTS_DIR / agent_name.lower() / "WAKE.md"
    if not wake_file.exists():
        return []
    # If WAKE.md exists, require it or its contents be mentioned
    return ["WAKE.md"]


def discover_agents():
    if not AGENTS_DIR.exists():
        return {}
    return {
        entry.name.lower(): entry.name
        for entry in AGENTS_DIR.iterdir()
        if entry.is_dir() and (entry / "soul.md").exists()
    }


def resolve_agent_agent(agent_type, prompt):
    agents = discover_agents()
    prompt_lower = str(prompt or "").lower()
    for key, display_name in agents.items():
        if re.search(rf"\b(?:you are|become|as|hey)\s+@?{re.escape(key)}\b", prompt_lower):
            return display_name

    candidate = str(agent_type or "").strip().lower()
    if candidate in agents:
        return agents[candidate]

    for key, display_name in agents.items():
        if f"/.agent-memory/agents/{key}/" in prompt_lower or f"agents/{key}/" in prompt_lower:
            return display_name
    return None


def check_spawn_requirements(agent_type, prompt):
    agent_name = resolve_agent_agent(agent_type, prompt)
    if not agent_name or str(agent_type or "").strip().lower() in EXEMPT_TYPES:
        return []

    text = str(prompt or "")
    lower = text.lower()
    violations = []
    agent_path = f"agents/{agent_name.lower()}/"

    reads_identity = agent_path in lower or all(name in lower for name in ("soul.md", "work.md"))
    reads_brain = agent_path in lower or all(name in lower for name in ("brain/memory.md", "brain/learnings.md", "brain/patterns.md"))
    if not reads_identity or not reads_brain:
        violations.append(
            f"Agent '{agent_name}' must be told to read its identity and brain files before working: "
            f"~/.agent-memory/agents/{agent_name.lower()}/soul.md, work.md, brain/memory.md, "
            "brain/learnings.md, and brain/patterns.md."
        )

    # Check agent-specific required reads (from AGENT_REQUIRED_READS and WAKE.md)
    agent_key = agent_name.lower()
    required_files = list(AGENT_REQUIRED_READS.get(agent_key, []))
    required_files.extend(get_wake_requirements(agent_name))

    if required_files:
        missing_reads = []
        for required_file in required_files:
            if required_file.lower() not in lower:
                missing_reads.append(required_file)
        if missing_reads:
            violations.append(
                f"Agent '{agent_name}' has mandatory reads that must be included in the spawn prompt:\n"
                + "\n".join(f"  - {f}" for f in missing_reads)
                + f"\n\nCheck ~/.agent-memory/agents/{agent_key}/WAKE.md or AGENT_REQUIRED_READS. "
                "Add them to the spawn prompt so the agent reads them at wake."
            )

    negative_logging = re.search(r"\b(?:do not|don't|dont|no need to)\s+(?:read|log|update)", lower)
    action = r"(?:log|update|write|record)"

    def has_log_target(filename):
        segments = re.split(r"(?<=[!?])\s+|\n+", lower)
        return any(
            filename in segment and re.search(rf"\b{action}\b", segment)
            for segment in segments
        )

    has_memory_log = has_log_target("memory.md")
    has_activity_log = has_log_target("activity.md")
    has_trace_contract = "trace" in lower and ("session" in lower or "brain-sync" in lower or "bidirectional" in lower)
    if negative_logging or not (has_memory_log and has_activity_log and has_trace_contract):
        violations.append(
            f"Agent '{agent_name}' must be told to log its work before finishing: update its brain/memory.md "
            "and the relevant project ACTIVITY.md with the session ID and bidirectional traces."
        )
    return violations


def extract_prompt(tool_input):
    for key in ("prompt", "instructions", "task", "message"):
        value = tool_input.get(key)
        if isinstance(value, str) and value.strip():
            return value

    items = tool_input.get("items")
    if isinstance(items, list):
        return "\n".join(
            item.get("text", "")
            for item in items
            if isinstance(item, dict) and isinstance(item.get("text"), str)
        )

    return ""


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return
    tool_name = payload.get("tool_name", "")
    if tool_name not in {"Task", "Agent", "spawn_agent"}:
        return
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return
    prompt = extract_prompt(tool_input)
    agent_type = (
        tool_input.get("subagent_type")
        or tool_input.get("agent_type")
        or tool_input.get("profile")
        or tool_input.get("name")
        or ""
    )
    violations = check_spawn_requirements(agent_type, prompt)
    if not violations:
        return
    print(json.dumps({
        "decision": "block",
        "reason": (
            "agent agent spawn blocked — the main agent must pass the read-and-log contract:\n\n"
            + "\n\n".join(f"[ERROR] {violation}" for violation in violations)
            + "\n\nFix the spawn prompt, then retry."
        ),
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)
