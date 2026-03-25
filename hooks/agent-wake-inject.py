#!/usr/bin/env python3
"""
UserPromptSubmit hook — detects "Hey [Agent]" patterns and injects wake requirements.

When a user says "Hey <Agent>" or similar, this hook checks if that agent has
mandatory reads beyond the standard files, and surfaces them.
"""

import json
import re
import sys
from pathlib import Path

AGENTS_DIR = Path.home() / ".agent-memory" / "agents"

# Agent-specific mandatory reads beyond the standard files
AGENT_REQUIRED_READS = {
    # Agent-specific mandatory reads beyond the standard brain files.
    # "example": ["extra/file.md", "another/file.md"],
}


def discover_agents():
    """Scan ~/.agent-memory/agents/ for agent directories (must contain soul.md)."""
    if not AGENTS_DIR.exists():
        return {}
    return {
        entry.name.lower(): entry.name
        for entry in AGENTS_DIR.iterdir()
        if entry.is_dir() and (entry / "soul.md").exists()
    }


def detect_agent_wake(message: str) -> str | None:
    """Detect if the message is waking an agent. Returns agent name or None."""
    agents = discover_agents()
    message_lower = message.lower().strip()

    for agent_key in agents:
        # Match patterns like "Hey <Agent>", "Hey @<Agent>", "Hi <Agent>", "<Agent>,"
        patterns = [
            rf"^hey\s+@?{agent_key}\b",
            rf"^hi\s+@?{agent_key}\b",
            rf"^yo\s+@?{agent_key}\b",
            rf"^@{agent_key}\b",
            rf"^{agent_key},",
        ]
        for pat in patterns:
            if re.search(pat, message_lower):
                return agent_key
    return None


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return

    message = payload.get("message", "")
    if not message:
        return

    agent = detect_agent_wake(message)
    if not agent:
        return

    # Check if this agent has required reads
    if agent not in AGENT_REQUIRED_READS:
        return

    required_files = AGENT_REQUIRED_READS[agent]
    files_list = "\n".join(f"  - {f}" for f in required_files)

    # Inject a system message reminding about mandatory reads
    result = {
        "message": (
            f"[WAKE PROTOCOL for {agent.capitalize()}]\n"
            f"This agent has mandatory content reads beyond the standard brain files:\n"
            f"{files_list}\n"
            f"Read these BEFORE responding. They ground the agent's craft."
        )
    }
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)
