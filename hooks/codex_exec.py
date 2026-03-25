#!/usr/bin/env python3
import os
import subprocess
import sys
from pathlib import Path

from common import append_event, codex_env_session_id, run_pipeline, update_current_session


def resolve_real_codex_path():
    override = os.environ.get("AGENT_CODEX_REAL")
    if override:
        return Path(override)
    if os.name == "nt":
        appdata = os.environ.get("APPDATA")
        if appdata:
            return Path(appdata) / "npm" / "codex.cmd"
        return Path("codex.cmd")
    return Path.home() / ".npm-global" / "bin" / "codex"


def main():
    real_codex_path = resolve_real_codex_path()
    if not real_codex_path.exists():
        print(f"codex wrapper error: real binary not found at {real_codex_path}", file=sys.stderr)
        sys.exit(1)

    args = sys.argv[1:]
    session_id = codex_env_session_id()
    payload = {
        "argv": args,
        "cwd": os.getcwd(),
        "pid": os.getpid(),
        "session_id": session_id,
    }

    update_current_session("codex", session_id=session_id, event="session_start", cwd=payload["cwd"], pid=payload["pid"], active=True)
    append_event({"source": "codex", "type": "session_start", **payload})
    run_pipeline("session_start", payload, "codex", strict=False)

    env = os.environ.copy()
    env["AGENT_CODEX_WRAPPER_ACTIVE"] = "1"
    env["AGENT_CODEX_REAL"] = str(real_codex_path)

    try:
        completed = subprocess.run([str(real_codex_path), *args], env=env)
        exit_code = completed.returncode
    except KeyboardInterrupt:
        exit_code = 130

    end_payload = {**payload, "exit_code": exit_code}
    update_current_session(
        "codex",
        session_id=session_id,
        event="session_end",
        cwd=payload["cwd"],
        pid=payload["pid"],
        active=False,
        extra={"exit_code": exit_code},
    )
    append_event({"source": "codex", "type": "session_end", **end_payload})
    run_pipeline("session_end", end_payload, "codex", strict=False)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
