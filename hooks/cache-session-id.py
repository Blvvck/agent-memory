#!/usr/bin/env python3
"""
PostToolUse hook — caches the current session ID to temp dir.

Reads session_id directly from the hook input (provided by Claude Code).
Writes structured metadata so consumers can detect stale or mismatched cache
instead of blindly trusting a bare short ID string.
"""

import json
import socket
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path


CACHE_FILE = Path(tempfile.gettempdir()) / "claude-session-id"

# Auto-detect machine from hostname
_hostname = socket.gethostname().lower()
if "desktop" in _hostname or "omen" in _hostname:
    MACHINE = "omen"
else:
    MACHINE = "mac"


def main():
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    try:
        session_id = hook_input.get("session_id", "")
        if not session_id:
            sys.exit(0)

        sid = f"{MACHINE}:{session_id[:8]}"
        payload = {
            "machine": MACHINE,
            "session_id": session_id,
            "short_session": sid,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Skip if cache already has the correct full session ID
        if CACHE_FILE.exists():
            try:
                cached = json.loads(CACHE_FILE.read_text())
                if cached.get("session_id") == session_id:
                    sys.exit(0)
            except (OSError, json.JSONDecodeError):
                pass

        CACHE_FILE.write_text(json.dumps(payload))
        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == "__main__":
    main()
