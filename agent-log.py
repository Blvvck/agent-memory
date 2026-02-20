#!/usr/bin/env python3
"""The only supported command-line writer for agent protected logs."""

import argparse
import json
import os
import sys
from pathlib import Path

from protected_log import (
    ProtectedLogError,
    repair_backward_trace,
    repair_bullet_trace_markers,
    repair_entry_header,
    retag_entry,
    write_entry,
)


class WriterArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        self.print_usage(sys.stderr)
        self.exit(
            2,
            "writer input error: " + message + "\n"
            "next_steps: provide the target file, entry content, exact older-header or stable timestamp/agent/session trace (or 'none (new topic)'), "
            "real agent/runtime/session metadata, and the canonical project. Do not edit the protected log directly.\n",
        )


WRITER = Path(__file__).resolve().parent / "agent-log"
ACTIVE_MODE = None
ENTRY_REPAIR_HINTS = (
    "nested entry header", "repair header", "repair replacement", "repair dropped",
    "repair may", "repair source entry", "repair changed", "repair left",
    "only their own entries", "duplicates an existing entry",
)
ENTRY_REPAIR_STEPS = (
    "Entry repair deletes a writer header that was pasted into an entry subject. Open the log, "
    "copy the broken entry's header line, then run: "
    f"{WRITER} --file <log> --repair-entry --header '<header line exactly as printed>' "
    "--replacement '<same line with only the pasted fragment removed>' --agent <the entry's own "
    "agent> --cli <your runtime> --session-id <your real session ID> [--project <project>]. "
    "If a line contains backticks, quotes or other shell characters, write that one line to a "
    "scratch file and pass --header-file and/or --replacement-file instead. "
    "Only the entry's author may repair it, and nothing else in the entry may change."
)


def next_steps(error, mode=None):
    message = str(error).lower()
    mode = mode or ACTIVE_MODE
    # Backward-trace refusals share the phrase "repair source entry" with entry repair, so the
    # running mode has to decide before the message text does, or the wrong repair gets advised.
    if mode != "backward-trace" and any(hint in message for hint in ENTRY_REPAIR_HINTS):
        return ENTRY_REPAIR_STEPS
    if "repair" in message:
        return "Use --repair-backward-trace only for a strict writer entry whose sole backward trace is 'none (new topic)'; provide a verified older target and real agent/runtime/session metadata. It cannot rewrite prose or headers."
    if "backward trace target does not resolve" in message:
        return "Read the target, run trace-search, and pass either the complete exact header or a stable [timestamp] @Agent [session:cli:id] reference for one existing older entry; do not invent a header."
    if "backward trace target is ambiguous" in message:
        return "Choose a unique complete older entry header from the target file, or use --trace 'none (new topic)' only when this is genuinely unrelated."
    if "new entry needs" in message or "trace" in message and "target" not in message:
        return "Provide exactly one backward trace with --trace, using a complete older header or the exact value 'none (new topic)'."
    if "session" in message:
        return "Use the real runtime session ID from the hook environment or pass --session-id; never use unknown, current, placeholder, or guessed metadata."
    if "project" in message:
        return "Use the canonical project implied by the target path; global ~/.agent-memory logs use --project universal."
    if "preamble" in message or "historical" in message or "reordered" in message:
        return "Do not edit the log directly or rewrite history. Re-read the target and retry with the protected writer so it inserts at the first valid-entry boundary."
    return "Do not bypass the guard. Re-read the target, confirm the canonical project and runtime metadata, then retry through the protected writer."


def rendered_entry(header, content, trace):
    lines = [header]
    parts = content.strip("\n").splitlines()
    if parts:
        lines.extend(parts[1:])
    if trace == "none (new topic)":
        lines.append("  - ↪ trace: none (new topic)")
    else:
        lines.append(f"  - ↪ trace: relates-to {trace}")
    return "\n".join(lines)


def _single_line(value, path, inline_flag, file_flag):
    """Header lines carry backticks and quotes, so the shell cannot always pass them safely."""
    if value is not None and path is not None:
        raise ProtectedLogError(
            f"pass either {inline_flag} or {file_flag}, not both. {ENTRY_REPAIR_STEPS}"
        )
    if path is None:
        return value
    try:
        text = Path(path).expanduser().read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise ProtectedLogError(
            f"cannot read {file_flag} {path}: {error}. Write the single header line to that file first"
        ) from error
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) != 1:
        raise ProtectedLogError(
            f"{file_flag} must contain exactly one non-empty line, the header line and nothing else, "
            f"but {path} has {len(lines)}. Copy the entry's header line on its own"
        )
    return lines[0]


def main():
    parser = WriterArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--content")
    parser.add_argument("--content-file")
    parser.add_argument("--trace")
    parser.add_argument("--header")
    parser.add_argument("--header-file")
    parser.add_argument("--replacement")
    parser.add_argument("--replacement-file")
    parser.add_argument("--repair-entry", action="store_true")
    parser.add_argument("--repair-bullet-traces", action="store_true")
    parser.add_argument("--repair-backward-trace", action="store_true")
    parser.add_argument("--retag", action="store_true")
    parser.add_argument("--agent")
    parser.add_argument("--cli", choices=("claude", "codex", "agy", "antigravity", "opencode"))
    parser.add_argument("--session-id")
    parser.add_argument("--project")
    args = parser.parse_args()

    global ACTIVE_MODE
    ACTIVE_MODE = (
        "backward-trace"
        if args.repair_backward_trace
        else "entry"
        if args.repair_entry
        else "retag"
        if args.retag
        else "bullet-traces"
        if args.repair_bullet_traces
        else "write"
    )

    if args.retag:
        if args.repair_bullet_traces or args.repair_backward_trace or args.repair_entry or not args.header or not args.project or any(value is not None for value in (args.content, args.content_file, args.trace, args.header_file, args.replacement, args.replacement_file)):
            parser.error("retag requires --header and --project, and no content, trace, or repair mode")
        if not args.agent or not args.cli:
            parser.error("--agent and --cli are required for retag")
        session_id = args.session_id or os.environ.get("AGENT_SESSION_ID") or os.environ.get("CODEX_SESSION_ID")
        if not session_id:
            raise ProtectedLogError("session ID is required for retag")
        runtime = {"agent": args.agent, "cli": args.cli, "session_id": session_id, "project": args.project}
        retagged = retag_entry(args.file, args.header, runtime)
        print(json.dumps({"ok": True, "file": str(Path(args.file).expanduser().resolve()), "retagged": retagged}))
        return
    if args.repair_backward_trace:
        if args.repair_bullet_traces or args.repair_entry or not args.header or not args.trace or any(value is not None for value in (args.content, args.content_file, args.header_file, args.replacement, args.replacement_file)):
            parser.error("backward-trace repair requires --header and --trace, and no content or other repair mode")
        if not args.agent or not args.cli:
            parser.error("--agent and --cli are required for backward-trace repair")
        session_id = args.session_id or os.environ.get("AGENT_SESSION_ID") or os.environ.get("CODEX_SESSION_ID")
        if not session_id:
            raise ProtectedLogError("session ID is required for backward-trace repair")
        runtime = {"agent": args.agent, "cli": args.cli, "session_id": session_id}
        if args.project:
            runtime["project"] = args.project
        repaired = repair_backward_trace(args.file, args.header, args.trace, runtime)
        print(json.dumps({"ok": True, "file": str(Path(args.file).expanduser().resolve()), "repaired": repaired, "target": args.trace}))
        return
    if args.repair_entry:
        if (
            args.repair_bullet_traces
            or args.repair_backward_trace
            or args.retag
            or (args.header is None) == (args.header_file is None)
            or (args.replacement is None) == (args.replacement_file is None)
            or any(value is not None for value in (args.content, args.content_file, args.trace))
        ):
            parser.error(
                "entry repair needs one of --header/--header-file and one of "
                "--replacement/--replacement-file, and no --content, --trace, --retag or other "
                "repair mode. " + ENTRY_REPAIR_STEPS
            )
        if not args.agent or not args.cli:
            parser.error("--agent and --cli are required for entry repair. " + ENTRY_REPAIR_STEPS)
        session_id = args.session_id or os.environ.get("AGENT_SESSION_ID") or os.environ.get("CODEX_SESSION_ID")
        if not session_id:
            raise ProtectedLogError(
                "session ID is required for entry repair; pass --session-id with the real ID of the "
                "session that wrote this entry, or let AGENT_SESSION_ID supply it. " + ENTRY_REPAIR_STEPS
            )
        header = _single_line(args.header, args.header_file, "--header", "--header-file")
        replacement = _single_line(
            args.replacement, args.replacement_file, "--replacement", "--replacement-file"
        )
        runtime = {"agent": args.agent, "cli": args.cli, "session_id": session_id}
        if args.project:
            runtime["project"] = args.project
        repaired = repair_entry_header(args.file, header, replacement, runtime)
        print(json.dumps({"ok": True, "file": str(Path(args.file).expanduser().resolve()), "repaired": repaired}))
        return
    if args.repair_bullet_traces:
        if not args.header or any(value is not None for value in (args.content, args.content_file, args.trace, args.header_file, args.replacement, args.replacement_file)):
            parser.error("repair mode requires --header and no content or trace")
        repair_bullet_trace_markers(args.file, args.header)
        print(json.dumps({"ok": True, "file": str(Path(args.file).expanduser().resolve()), "repaired": args.header}))
        return
    if not args.trace:
        parser.error("--trace is required unless repair mode is selected")
    if args.replacement is not None or args.replacement_file is not None or args.header_file is not None:
        parser.error("--replacement, --replacement-file and --header-file require --repair-entry")
    if not args.agent or not args.cli:
        parser.error("--agent and --cli are required unless repair mode is selected")
    if (args.content is None) == (args.content_file is None):
        parser.error("provide exactly one of --content or --content-file")
    content = args.content
    if args.content_file:
        content = Path(args.content_file).read_text(encoding="utf-8")
    session_id = args.session_id or os.environ.get("AGENT_SESSION_ID") or os.environ.get("CODEX_SESSION_ID")
    if not session_id:
        raise ProtectedLogError("session ID is required; pass --session-id or provide runtime metadata")
    runtime = {
        "agent": args.agent,
        "cli": args.cli,
        "session_id": session_id,
    }
    if args.project:
        runtime["project"] = args.project
    header = write_entry(args.file, content, runtime, args.trace)
    print(json.dumps({
        "ok": True,
        "file": str(Path(args.file).expanduser().resolve()),
        "header": header,
        "entry": rendered_entry(header, content, args.trace),
    }))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ProtectedLogError) as error:
        print(json.dumps({
            "ok": False,
            "error": str(error),
            "next_steps": next_steps(error),
            "writer": str(Path(__file__).resolve()),
        }))
        sys.exit(2)
