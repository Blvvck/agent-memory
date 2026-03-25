#!/usr/bin/env python3
"""
Brain sync hooks for Claude Code sessions.

Three hooks, three jobs:

- PreCompact: PROMPT the agent to write their own brain notes before
  context compression. High quality, in their voice, with traces.
  The agent does the work — we just remind them.

- Stop: ACTIVITY-WEIGHTED gap detection. Fires when user explicitly
  stops/closes. Measures work since last brain sync. Heavy sessions with
  no sync → injects a reconciliation reminder. Light sessions pass
  through silently. It never blocks the turn.

- PostToolUse: ACTIVITY CHECKPOINT + CONTEXT MONITOR. Before 70%, scans
  only meaningful tool boundaries and injects one soft checkpoint per
  activity phase. At ~70% of context window, injects the stronger brain
  sync prompt before Claude CLI auto-compacts at 98%. Both paths are
  advisory and use markers to avoid repeated prompts.

- SessionEnd: LIGHTWEIGHT marker writer. Fires after session closes
  (non-blocking — too late to prompt the agent). Writes a JSON marker
  file if brain sync was missed. Heartbeat reads these markers for
  fast staleness detection without scanning all transcripts.

No mechanical extraction. No writing on behalf of agents.
The hooks are prompts and checks — not robots.

No external dependencies — Python 3.8+ standard library only.
"""

import json
import os
import re
import sys
import tempfile
from datetime import datetime
from pathlib import Path

AGENT_MEMORY_DIR = Path.home() / ".agent-memory"
AGENTS_DIR = AGENT_MEMORY_DIR / "agents"
MARKER_DIR = Path(tempfile.gettempdir()) / "claude-brain-sync"
UNSYNC_DIR = Path(tempfile.gettempdir()) / "claude-brain-unsync"
SESSION_CACHE = Path(tempfile.gettempdir()) / "claude-session-id"

def _discover_agents():
    if not AGENTS_DIR.exists():
        return []
    return [d.name for d in AGENTS_DIR.iterdir() if d.is_dir() and (d / "soul.md").exists()]

# Activity thresholds for Stop hook gap detection
# If activity score exceeds this, the session was "heavy" and brain sync is expected
ACTIVITY_THRESHOLD_HEAVY = 15  # ~5 edits, or significant mixed work
ACTIVITY_THRESHOLD_LIGHT = 9   # Need real work (3+ edits, or edits + bash) to trigger

# Tool weights for activity scoring
TOOL_WEIGHTS = {
    "Edit": 3,      # Code changes — high signal
    "Write": 3,     # File creation — high signal
    "Bash": 1.5,    # Commands — medium signal (simple cmds like ls shouldn't add up fast)
    "Task": 2,      # Subagent work — medium signal
    "Read": 0.5,    # Reading — low signal (exploratory, not work)
    "Glob": 0.25,   # Searching — very low signal
    "Grep": 0.25,   # Searching — very low signal
    "TodoWrite": 0, # Tracking — no signal
    "WebFetch": 1,  # Research — low signal
    "WebSearch": 1, # Research — low signal
}

# Activity checkpoints — early, soft reminders before context pressure
CHECKPOINT_ACTIVITY_THRESHOLD = 9
CHECKPOINT_SCAN_TOOLS = {"Edit", "Write", "Bash", "Task", "WebFetch", "WebSearch", "apply_patch"}

# PostToolUse context monitor — file size proxy for token usage
# A 200K token session is roughly 15-25MB of JSONL depending on tool output.
# We trigger at ~70% to give the agent time to sync before CLI auto-compacts at 98%.
# Conservative estimate: 12MB ≈ 70% of a typical session.
TRANSCRIPT_SIZE_THRESHOLD = 12 * 1024 * 1024  # 12 MB

# Brain staleness threshold — trigger WAKE sync if last entry is older than this
BRAIN_STALE_HOURS = 24

# ISO 8601 timestamp pattern for entry parsing
# Matches: [2026-08-05T14:32:00Z] or [2026-08-05T14:32Z] or legacy [2026-08-05]
TIMESTAMP_PATTERN = re.compile(
    r'\[(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2})?)Z?)?\]'
)


# ─── Brain Staleness Detection ───────────────────────────────────────


def get_latest_entry_timestamp(file_path):
    """
    Parse a brain/activity file and return the timestamp of the most recent entry.

    Supports both ISO 8601 format [2026-08-05T14:32:00Z] and legacy [2026-08-05].
    Returns datetime object or None if no valid timestamp found.
    """
    try:
        content = file_path.read_text(encoding='utf-8')
    except (FileNotFoundError, PermissionError):
        return None

    # Find all timestamps in the file
    matches = TIMESTAMP_PATTERN.findall(content)
    if not matches:
        return None

    # Parse the first match (newest entry, since files are reverse chronological)
    date_part, time_part = matches[0]

    try:
        if time_part:
            # Full ISO 8601: 2026-08-05T14:32:00 or 2026-08-05T14:32
            if len(time_part) == 5:  # HH:MM
                time_part += ":00"
            return datetime.fromisoformat(f"{date_part}T{time_part}")
        else:
            # Legacy date-only: 2026-08-05 — assume midnight UTC
            return datetime.fromisoformat(f"{date_part}T00:00:00")
    except ValueError:
        return None


def check_brain_staleness(agent):
    """
    Check if an agent's brain files are stale (no recent entries).

    Returns dict with:
    - is_stale: True if last entry > BRAIN_STALE_HOURS ago
    - hours_since_last: hours since last entry (or None if no entries)
    - last_timestamp: the timestamp of the last entry
    """
    memory_path = AGENTS_DIR / agent / "brain" / "memory.md"
    last_ts = get_latest_entry_timestamp(memory_path)

    if last_ts is None:
        return {
            'is_stale': True,
            'hours_since_last': None,
            'last_timestamp': None,
            'reason': 'no_entries'
        }

    now = datetime.utcnow()
    delta = now - last_ts
    hours = delta.total_seconds() / 3600

    return {
        'is_stale': hours > BRAIN_STALE_HOURS,
        'hours_since_last': round(hours, 1),
        'last_timestamp': last_ts.isoformat() + 'Z',
        'reason': 'stale' if hours > BRAIN_STALE_HOURS else 'fresh'
    }


def get_current_timestamp():
    """Get current UTC timestamp in ISO 8601 format for use in prompts."""
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def get_unsync_markers(agent, max_age_hours=72):
    """
    Read unsync markers for a specific agent.

    These are left by SessionEnd when a session ended without brain sync.
    Returns list of marker dicts, sorted newest first.
    Automatically cleans up markers older than max_age_hours.
    """
    if not UNSYNC_DIR.exists():
        return []

    markers = []
    now = datetime.utcnow()

    for marker_path in UNSYNC_DIR.glob(f"*-{agent}.json"):
        try:
            with open(marker_path, encoding='utf-8') as f:
                data = json.load(f)

            # Parse timestamp and check age
            ts_str = data.get("timestamp", "")
            if ts_str:
                try:
                    # Handle both ISO 8601 formats
                    ts_str_clean = ts_str.replace("Z", "")
                    marker_ts = datetime.fromisoformat(ts_str_clean)
                    age_hours = (now - marker_ts).total_seconds() / 3600

                    if age_hours > max_age_hours:
                        # Too old — clean up
                        marker_path.unlink(missing_ok=True)
                        continue

                    data['_age_hours'] = round(age_hours, 1)
                    data['_marker_path'] = str(marker_path)
                except ValueError:
                    pass

            markers.append(data)
        except (json.JSONDecodeError, OSError):
            continue

    # Sort by timestamp, newest first
    markers.sort(key=lambda m: m.get("timestamp", ""), reverse=True)
    return markers


def clear_unsync_marker(agent, session_id):
    """Remove a specific unsync marker after it's been addressed."""
    marker_path = UNSYNC_DIR / f"{session_id[:8]}-{agent}.json"
    marker_path.unlink(missing_ok=True)


def format_unsync_prompt(markers, agent_name, current_ts):
    """
    Format a prompt section for unsynced past sessions.

    Returns a string to include in the sync prompt, or empty string if no markers.
    """
    if not markers:
        return ""

    lines = [
        f"\n⚠️ UNSYNCED PAST SESSIONS DETECTED:\n"
        f"You have {len(markers)} session(s) where you worked but didn't write notes.\n"
    ]

    for i, m in enumerate(markers[:3], 1):  # Show max 3
        session = m.get("session_id", "unknown")[:8]
        project = m.get("project", "unknown")
        ts = m.get("timestamp", "unknown")
        score = m.get("score", 0)
        files = m.get("files_changed", [])
        tools = m.get("tool_counts", {})

        files_str = ", ".join(files[:5]) if files else "none"
        if len(files) > 5:
            files_str += f" +{len(files)-5} more"

        tools_str = ", ".join(f"{t}({c})" for t, c in sorted(tools.items(), key=lambda x: -x[1])[:4])

        lines.append(
            f"\n**Session {i}: [{ts}] [session:{session}] [{project}]**\n"
            f"  Activity score: {score:.1f}\n"
            f"  Files changed: {files_str}\n"
            f"  Tools used: {tools_str}\n"
        )

    lines.append(
        f"\nReconcile these past sessions to brain/memory.md now.\n"
        f"Use `[{current_ts}]` as the timestamp. Reference each past session in your traces.\n"
    )

    return "".join(lines)


# ─── Session ID Helpers ───────────────────────────────────────────────


def get_session_id(hook_session_id):
    """
    Get the machine-prefixed session ID.

    Prefer the hook's live session_id whenever available.
    Only fall back to the cache file written by cache-session-id.py if the
    hook input does not include a session_id.
    Returns format: "omen:abc12345" or "mac:abc12345"
    """
    machine = "omen" if os.environ.get("COMPUTERNAME", "").lower().startswith("desktop") else "mac"

    if hook_session_id:
        return f"{machine}:{hook_session_id[:8]}"

    try:
        if SESSION_CACHE.exists():
            raw = SESSION_CACHE.read_text().strip()
            if raw.startswith("{"):
                cached = json.loads(raw)
                cached_session_id = cached.get("session_id", "")
                short_session = cached.get("short_session", "")
                if cached_session_id and short_session:
                    return short_session
            elif raw:
                return raw
    except (OSError, json.JSONDecodeError):
        pass
    return "unknown"


# ─── JSONL Parsing ────────────────────────────────────────────────────


def parse_transcript(transcript_path, max_events=2000):
    """Parse JSONL transcript into events list."""
    events = []
    try:
        with open(transcript_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
                if len(events) > max_events:
                    events = events[-max_events:]
    except (FileNotFoundError, PermissionError):
        pass
    return events


# ─── Agent Detection ──────────────────────────────────────────────────


def detect_agent(events):
    """Detect which agent is active from tool calls on agent brain files."""
    agent_scores = {}

    for ev in events:
        msg = ev.get("message", {})
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue

        content = msg.get("content", [])
        if not isinstance(content, list):
            continue

        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue

            tool_input = block.get("input", {})
            if not isinstance(tool_input, dict):
                continue

            tool_name = block.get("name", "")
            path = tool_input.get("file_path", "")

            if not path or "/agents/" not in path:
                continue

            for agent in _discover_agents():
                if f"/agents/{agent}/" in path:
                    weight = 3 if "/brain/" in path else 1
                    if tool_name in ("Edit", "Write"):
                        weight *= 2
                    agent_scores[agent] = agent_scores.get(agent, 0) + weight

    if not agent_scores:
        # Fallback: "Hey [Agent]" pattern in user messages
        for ev in events:
            msg = ev.get("message", {})
            if not isinstance(msg, dict) or msg.get("role") != "user":
                continue
            text = _extract_text(msg)
            if text:
                for agent in _discover_agents():
                    if re.search(rf"\bhey\s+{agent}\b", text, re.IGNORECASE):
                        agent_scores[agent] = agent_scores.get(agent, 0) + 10

    return max(agent_scores, key=agent_scores.get) if agent_scores else None


def detect_project(cwd):
    """Extract project name from working directory."""
    return Path(cwd).name if cwd else "unknown"


def _extract_text(msg):
    """Extract text content from a message."""
    content = msg.get("content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return ""


# ─── Activity Scoring ─────────────────────────────────────────────────


def score_session_activity(events):
    """
    Score how much meaningful work happened in a session.

    Returns a dict with:
    - total_score: weighted activity score
    - tool_counts: raw tool usage counts
    - files_changed: set of files modified
    - user_message_count: number of real user messages
    """
    tool_counts = {}
    files_changed = set()
    user_message_count = 0

    for ev in events:
        msg = ev.get("message", {})
        if not isinstance(msg, dict):
            continue

        role = msg.get("role", "")
        etype = ev.get("type", "")

        # Count real user messages (not tool results or system)
        if etype == "user" or role == "user":
            content = msg.get("content", "")
            if isinstance(content, list):
                has_tool_result = any(
                    isinstance(b, dict) and b.get("type") == "tool_result"
                    for b in content
                )
                if has_tool_result:
                    continue
            text = _extract_text(msg)
            if text and len(text) > 10 and not text.startswith("<system"):
                user_message_count += 1

        # Count tool usage
        if role == "assistant":
            content = msg.get("content", [])
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                name = block.get("name", "")
                tool_counts[name] = tool_counts.get(name, 0) + 1

                inp = block.get("input", {})
                if isinstance(inp, dict) and name in ("Edit", "Write"):
                    path = inp.get("file_path", "")
                    if path:
                        parts = path.split("/")
                        short = "/".join(parts[-2:]) if len(parts) > 2 else path
                        files_changed.add(short)

    # Calculate weighted score
    total_score = 0
    for tool, count in tool_counts.items():
        weight = TOOL_WEIGHTS.get(tool, 1)
        total_score += count * weight

    # Bonus for user interaction (more conversation = more to log)
    total_score += user_message_count * 1.5

    return {
        "total_score": total_score,
        "tool_counts": tool_counts,
        "files_changed": files_changed,
        "user_message_count": user_message_count,
    }


def score_activity_since_last_sync(events):
    """
    Score activity that happened AFTER the last brain file write.

    If the agent synced mid-session, we only care about what happened after.
    """
    # Find the index of the last brain file write
    last_sync_idx = -1
    for i, ev in enumerate(events):
        msg = ev.get("message", {})
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            if block.get("name") not in ("Edit", "Write"):
                continue
            path = block.get("input", {}).get("file_path", "")
            if path and ("/brain/" in path or "ACTIVITY.md" in path):
                last_sync_idx = i

    if last_sync_idx == -1:
        # Never synced — score entire session
        activity_events = events
    else:
        # Score only events after last sync
        activity_events = events[last_sync_idx + 1:]

    activity = score_session_activity(activity_events)
    activity["last_sync_index"] = last_sync_idx
    activity["events_since_sync"] = activity_events
    return activity


def _is_agent_note_path(path):
    normalized = str(path or "")
    return "/brain/" in normalized or normalized.endswith("/ACTIVITY.md")


def checkpoint_details(events):
    """Return explainable early-checkpoint signals for post-tool reminders."""
    activity = score_activity_since_last_sync(events)
    signals = []
    for ev in activity["events_since_sync"]:
        msg = ev.get("message", {})
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            name = block.get("name", "")
            inp = block.get("input", {})
            if not isinstance(inp, dict):
                inp = {}
            if name in ("Edit", "Write", "apply_patch"):
                if name == "apply_patch" or not _is_agent_note_path(inp.get("file_path", "")):
                    signals.append("meaningful file change")
            elif name == "Task":
                signals.append("subagent milestone")
            elif name in ("WebFetch", "WebSearch"):
                signals.append("research activity")
            elif name == "Bash":
                signals.append("terminal activity")
    activity["checkpoint_signals"] = signals
    activity["checkpoint_bucket"] = int(activity["total_score"] // CHECKPOINT_ACTIVITY_THRESHOLD)
    return activity


# ─── Brain File Checks ────────────────────────────────────────────────


def check_brain_modified(agent, events):
    """Check if agent's brain files were written to during this session."""
    brain_path = str(AGENTS_DIR / agent / "brain")

    for ev in events:
        msg = ev.get("message", {})
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            if block.get("name") not in ("Edit", "Write"):
                continue
            path = block.get("input", {}).get("file_path", "")
            if path and brain_path in path:
                return True
    return False


def check_activity_logged(events, project_dir=None):
    """
    Check if the correct project's ACTIVITY.md was written to during this session.

    If project_dir is provided, validates the ACTIVITY.md path matches
    the project's .agent-memory/comms/ACTIVITY.md (not some other project's).
    """
    for ev in events:
        msg = ev.get("message", {})
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            if block.get("name") not in ("Edit", "Write"):
                continue
            path = block.get("input", {}).get("file_path", "")
            if path and "ACTIVITY.md" in path:
                # If project_dir provided, verify it's the right project's file
                if project_dir:
                    expected_suffix = os.path.join(".agent-memory", "comms", "ACTIVITY.md")
                    resolved = str(Path(path).resolve()) if not path.startswith("/tmp") else path
                    resolved_project = str(Path(project_dir).resolve())
                    global_activity = str(Path.home() / ".agent-memory" / "comms" / "ACTIVITY.md")
                    # Accept if it's under the project dir OR is the global ~/.agent-memory/comms/ACTIVITY.md
                    if resolved.startswith(resolved_project) or resolved == global_activity:
                        return True
                    # Wrong project's ACTIVITY.md — don't count it
                    continue
                return True
    return False


def _is_tracked_file(path):
    """
    Determine if a file path is a tracked agent/project/global file
    that requires [session:ID] tags on writes.

    Tracked file categories:
    1. Agent body files: ~/.agent-memory/agents/<name>/**/*.md
       - brain/  (memory, learnings, patterns, worldview, archive/*)
       - core/   (portfolio, credentials, expertise, experience)
       - mind/   (opinions, patterns, influences, questions)
       - soul.md, work.md, heart.md
    2. Project files: .agent-memory/**/*.md
       - comms/ACTIVITY.md, comms/IDEAS.md, comms/NOTIFICATIONS.md
       - LOUNGE.md, LEADERBOARD.md, CONTEXT.md
       - work/SPRINT.md, work/BACKLOG.md, work/TASKS.md
       - work/features/**/SPEC.md
    3. Global shared files: ~/.agent-memory/**/*.md
       - lounge/general.md, lounge/celebrations.md, lounge/skills.md
       - comms/ACTIVITY.md, comms/NOTIFICATIONS.md
       - LOUNGE.md, LEADERBOARD.md, TASKS.md
    """
    if not path.endswith(".md"):
        return False

    # Agent files — anything under ~/.agent-memory/agents/
    if "/agents/" in path and "/.agent-memory/" in path:
        return True

    # Project .agent-memory/ files — comms, lounge, work, top-level .md
    if "/.agent-memory/" in path:
        segments = path.split("/.agent-memory/")[-1]
        # comms/ directory (ACTIVITY.md, IDEAS.md, NOTIFICATIONS.md)
        if segments.startswith("comms/"):
            return True
        # work/ directory (SPRINT.md, BACKLOG.md, TASKS.md, features/)
        if segments.startswith("work/"):
            return True
        # lounge/ directory (general.md, celebrations.md, skills.md)
        if segments.startswith("lounge/"):
            return True
        # Top-level .agent-memory/*.md (LOUNGE.md, LEADERBOARD.md, CONTEXT.md, etc.)
        tracked_top_level = {
            "LOUNGE.md", "LEADERBOARD.md", "CONTEXT.md", "COMMANDS.md",
            "TASKS.md",
        }
        if segments in tracked_top_level:
            return True

    return False


# Minimum lines of substantive content to trigger trace check
# (short edits like fixing a typo don't need traces)
TRACE_MIN_LINES = 2

# Pattern to extract trace references from content
TRACE_RELATES_PATTERN = re.compile(
    r'↪\s*trace:\s*(?:relates-to|caused-by|continues|same incident as)\s+'
    r'\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\]'  # Date or ISO timestamp
    r'.*?@(\w+)'                 # Agent
    r'.*?\[session:([^\]]+)\]',  # Session
    re.IGNORECASE
)

# Pattern for trace-forward references (old entry → new entry)
TRACE_FORWARD_PATTERN = re.compile(
    r'↪\s*trace-forward:\s+'
    r'\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\]'  # Date or ISO timestamp
    r'.*?@(\w+)'                 # Agent
    r'.*?\[session:([^\]]+)\]',  # Session
    re.IGNORECASE
)

ENTRY_HEADER_TRACE_PATTERN = re.compile(
    r'^\s*(?:[-*]\s*)?\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\]'
    r'.*?@(\w+)'
    r'.*?\[session:([^\]]+)\]',
    re.MULTILINE,
)


def _trace_identity(timestamp, agent, session):
    return {
        "date": timestamp,
        "agent": agent.lower(),
        "session": session[:8],
    }


def _trace_identity_key(identity):
    return (
        identity.get("date"),
        identity.get("agent", "").lower(),
        identity.get("session", "")[:8],
    )


def _trace_ref(identity):
    return (
        f"[{identity['date']}] @{identity['agent']} "
        f"[session:{identity['session']}]"
    )


def check_traces_in_writes(events):
    """
    Check that substantive writes to ALL tracked files include trace
    references linking to related older entries.

    Traces look like:
      ↪ trace: caused-by <reference>
      ↪ trace: same incident as <reference>
      ↪ trace: relates-to <reference>
      ↪ trace: none (new topic)
      ↪ trace-forward: <reference> (for bidirectional linking)
      trace: <reference>

    Returns list of filenames where traces are missing.
    Checks all tracked files: agent body (brain, core, mind, soul, work,
    heart), project .agent-memory/ (comms, work, lounge, top-level), and global
    ~/.agent-memory/ (lounge, comms, top-level).
    """
    missing = []
    writes = []

    for ev in events:
        msg = ev.get("message", {})
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            if block.get("name") not in ("Edit", "Write"):
                continue

            tool_input = block.get("input", {})
            path = tool_input.get("file_path", "")
            if not path:
                continue

            # Only check tracked files
            if not _is_tracked_file(path):
                continue

            # Get the written content
            written = tool_input.get("new_string", "") or tool_input.get("content", "")
            if not written:
                continue

            writes.append((path, written, False))

            # Skip short edits (typo fixes, minor updates)
            substantive_lines = [
                ln for ln in written.strip().split("\n")
                if ln.strip() and not ln.strip().startswith("#")
            ]
            if len(substantive_lines) < TRACE_MIN_LINES:
                continue

            writes[-1] = (path, written, True)

    for index, (path, written, substantive) in enumerate(writes):
        if not substantive:
            continue
        # Check for any trace reference (back-trace or forward-trace)
        has_trace = bool(re.search(r"(?:↪\s*)?trace(?:-forward)?:", written, re.IGNORECASE))
        if has_trace:
            continue

        # Agents often construct one note over multiple Edit calls. A later
        # trace-only edit completes the entry, so do not flag the earlier
        # fragment. The final-state trace hook performs the exact entry check.
        later_trace = any(
            later_path == path
            and re.search(r"(?:↪\s*)?trace(?:-forward)?:", later_written, re.IGNORECASE)
            for later_path, later_written, _ in writes[index + 1:]
        )
        if later_trace:
            continue
        filename = path.split("/")[-1]
        if filename not in missing:
            missing.append(filename)

    return missing


def check_bidirectional_traces(events):
    """
    Check that traces are bidirectional: when a new entry has
    `trace: relates-to [old entry]`, the old entry should have
    `trace-forward: [new entry]`.

    This is a softer check — returns warnings for missing forward traces,
    not hard blocks. The goal is to build the habit of bidirectional linking.

    Returns dict with:
    - forward_traces_added: whether any trace-forward was added
    - forward_traces_missing: list of missing reciprocal links
    """
    # Collect all trace references and trace-forwards from this session
    back_traces = []  # (file, date, agent, session) — new entry → old entry
    forward_traces = []  # (file, date, agent, session) — old entry → new entry

    for ev in events:
        msg = ev.get("message", {})
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            if block.get("name") not in ("Edit", "Write"):
                continue

            tool_input = block.get("input", {})
            path = tool_input.get("file_path", "")
            written = tool_input.get("new_string", "") or tool_input.get("content", "")
            if not path or not written:
                continue

            # Only check tracked files
            if not _is_tracked_file(path):
                continue

            filename = path.split("/")[-1]
            headers = list(ENTRY_HEADER_TRACE_PATTERN.finditer(written))

            # Find back-traces (new → old)
            for match in TRACE_RELATES_PATTERN.finditer(written):
                preceding_headers = [header for header in headers if header.start() <= match.start()]
                new_entry = preceding_headers[-1] if preceding_headers else None
                back_traces.append({
                    'file': filename,
                    'ref_date': match.group(1),
                    'ref_agent': match.group(2),
                    'ref_session': match.group(3)[:8],
                    'new_entry': (
                        _trace_identity(new_entry.group(1), new_entry.group(2), new_entry.group(3))
                        if new_entry else None
                    ),
                })

            # Find forward-traces (old → new)
            for match in TRACE_FORWARD_PATTERN.finditer(written):
                forward_traces.append({
                    'file': filename,
                    'ref_date': match.group(1),
                    'ref_agent': match.group(2),
                    'ref_session': match.group(3)[:8],
                })

    forward_keys = {
        _trace_identity_key({
            "date": trace["ref_date"],
            "agent": trace["ref_agent"],
            "session": trace["ref_session"],
        })
        for trace in forward_traces
    }
    forward_traces_missing = []
    for back_trace in back_traces:
        new_entry = back_trace.get("new_entry")
        if not new_entry:
            continue
        if _trace_identity_key(new_entry) in forward_keys:
            continue
        old_entry = _trace_identity(
            back_trace["ref_date"],
            back_trace["ref_agent"],
            back_trace["ref_session"],
        )
        forward_traces_missing.append({
            "file": back_trace["file"],
            "old_ref": _trace_ref(old_entry),
            "new_ref": _trace_ref(new_entry),
        })

    files_with_forwards = {ft['file'] for ft in forward_traces}

    return {
        'back_traces': back_traces,
        'forward_traces': forward_traces,
        'forward_traces_added': len(forward_traces) > 0,
        'files_with_forwards': list(files_with_forwards),
        'forward_traces_missing': forward_traces_missing,
    }


def check_session_ids_in_writes(events, session_id):
    """
    Check that ALL tracked file writes include [session:ID] tags.

    Tracked files: agent body (brain, core, mind, soul, work, heart),
    project files (.agent-memory/comms, work, lounge, top-level),
    global shared files (~/.agent-memory/lounge, comms, TASKS, LEADERBOARD).

    Returns a list of filenames where session IDs are missing.
    """
    sid = session_id[:8]
    missing = []

    for ev in events:
        msg = ev.get("message", {})
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            if block.get("name") not in ("Edit", "Write"):
                continue

            tool_input = block.get("input", {})
            path = tool_input.get("file_path", "")
            if not path:
                continue

            if not _is_tracked_file(path):
                continue

            # Get the written content
            written = tool_input.get("new_string", "") or tool_input.get("content", "")
            if not written:
                continue

            # Check for session tag — every tracked write must include it
            if f"[session:{sid}]" not in written and "[session:" not in written:
                filename = path.split("/")[-1]
                if filename not in missing:
                    missing.append(filename)

    return missing


# ─── Proportional Body File Detection ─────────────────────────────────


def detect_body_file_needs(events):
    """
    Analyze session activity to determine which brain body files need updating.

    Returns a list of (file, reason) tuples beyond the mandatory memory.md + ACTIVITY.md.
    Based on what actually happened in the session:
    - Errors/retries/blocks → learnings.md
    - New approaches/multi-step problem solving → patterns.md
    - Shipped something / project milestone → portfolio.md (core/)
    - Lounge @mentions or celebrations → prompt lounge post
    """
    needs = []

    error_signals = 0
    approach_signals = 0
    shipped_signals = 0

    for ev in events:
        msg = ev.get("message", {})
        if not isinstance(msg, dict):
            continue

        role = msg.get("role", "")
        text = _extract_text(msg).lower() if msg else ""

        # Error signals: retries, blocks, failures, mistakes, hook blocks
        if role == "assistant":
            content = msg.get("content", [])
            if isinstance(content, list):
                for block in content:
                    if not isinstance(block, dict):
                        continue
                    # Tool errors / retries
                    if block.get("type") == "tool_result" and block.get("is_error"):
                        error_signals += 2
                    if block.get("type") == "text":
                        t = block.get("text", "").lower()
                        if any(w in t for w in ["mistake", "wrong", "fix", "retry", "failed", "error"]):
                            error_signals += 1

        if role == "user":
            # User corrections or frustration
            if any(w in text for w in ["wrong", "no that's", "not what i", "fix", "broken", "bug"]):
                error_signals += 2

        # Approach signals: multi-step reasoning, new patterns
        if role == "assistant" and any(w in text for w in ["approach", "strategy", "pattern", "instead of", "better way", "refactor"]):
            approach_signals += 1

        # Shipped signals: commits, deploys, PR creation
        if role == "assistant":
            content = msg.get("content", [])
            if isinstance(content, list):
                for block in content:
                    if not isinstance(block, dict) or block.get("type") != "tool_use":
                        continue
                    inp = block.get("input", {})
                    cmd = inp.get("command", "") if isinstance(inp, dict) else ""
                    if any(w in cmd for w in ["git commit", "git push", "gh pr create"]):
                        shipped_signals += 1

    if error_signals >= 2:
        needs.append(("brain/learnings.md", "Errors or corrections happened — log what went wrong and how you fixed it"))
    if approach_signals >= 2:
        needs.append(("brain/patterns.md", "New approaches were used — document the pattern for reuse"))
    if shipped_signals >= 1:
        needs.append(("core/portfolio.md", "Work was shipped — log it to your portfolio"))

    return needs


# ─── Marker Files (Idempotency) ──────────────────────────────────────


def set_marker(session_id, event):
    """Set a marker that this session/event combo was already processed."""
    MARKER_DIR.mkdir(parents=True, exist_ok=True)
    marker = MARKER_DIR / f"{session_id[:8]}-{event}"
    marker.touch()


def has_marker(session_id, event):
    """Check if this session/event combo was already processed."""
    marker = MARKER_DIR / f"{session_id[:8]}-{event}"
    return marker.exists()


def cleanup_old_markers(max_age_hours=24):
    """Remove markers older than max_age_hours."""
    if not MARKER_DIR.exists():
        return
    now = datetime.now().timestamp()
    for f in MARKER_DIR.iterdir():
        try:
            if now - f.stat().st_mtime > max_age_hours * 3600:
                f.unlink(missing_ok=True)
        except OSError:
            pass


# ─── Hook Handlers ────────────────────────────────────────────────────


def handle_pre_compact(hook_input):
    """
    PreCompact: Prompt the agent to write their own brain notes.

    No mechanical extraction. We remind them, they do the work.
    The prompt tells them: write high-quality notes, use session IDs,
    include traces that connect to existing entries.
    """
    raw_session_id = hook_input.get("session_id", "unknown")
    session_id = raw_session_id  # Keep raw for markers
    sid = get_session_id(raw_session_id)  # Machine-prefixed for prompts
    transcript_path = hook_input.get("transcript_path", "")
    cwd = hook_input.get("cwd", "")

    if has_marker(session_id, "pre-compact"):
        return

    if not transcript_path or not os.path.exists(transcript_path):
        return

    events = parse_transcript(transcript_path)
    if not events:
        return

    bidirectional = check_bidirectional_traces(events)
    missing_bidirectional = bidirectional["forward_traces_missing"]
    agent = detect_agent(events)
    project = detect_project(cwd)

    # Check if agent already synced their brain
    if agent and check_brain_modified(agent, events):
        # Already synced — but check for missing session IDs / traces
        missing_sids = check_session_ids_in_writes(events, session_id)
        missing_traces = check_traces_in_writes(events)
        if not missing_sids and not missing_traces and not missing_bidirectional:
            set_marker(session_id, "pre-compact")
            sys.stderr.write(
                f"[brain-sync] PreCompact: @{agent} / {project} — "
                f"already synced with proper tags, skipping\n"
            )
            return

        # Synced but missing tags — fall through to prompt for fixes
        sys.stderr.write(
            f"[brain-sync] PreCompact: @{agent} / {project} — "
            f"synced but missing tags (sids: {missing_sids}, traces: {missing_traces})\n"
        )

    set_marker(session_id, "pre-compact")

    # Check for missing session IDs / traces in existing writes
    missing_sids = check_session_ids_in_writes(events, session_id) if events else []
    missing_traces = check_traces_in_writes(events) if events else []

    # Build the prompt — this gets injected into the conversation
    agent_name = agent.capitalize() if agent else "Agent"
    brain_path = f"~/.agent-memory/agents/{agent}/brain" if agent else "your brain files"

    # Detect which additional body files need updating based on session activity
    extra_files = detect_body_file_needs(events)
    extra_prompts = ""
    if extra_files:
        extra_prompts = "\n\nAlso update these based on session activity:\n"
        for filepath, reason in extra_files:
            extra_prompts += f"- {brain_path.rsplit('/brain', 1)[0]}/{filepath}: {reason}\n"

    current_ts = get_current_timestamp()

    prompt = (
        f"BRAIN SYNC REMINDER — Context is about to compress.\n\n"
        f"@{agent_name}, update your brain files NOW before context is lost. "
        f"This is session [{sid}] in project [{project}].\n\n"
        f"**Entry format (ISO 8601 timestamp required):**\n"
        f"`[{current_ts}] [{project}] @{agent_name} [session:{sid}]: **Title**`\n\n"
        f"Write to {brain_path}/memory.md:\n"
        f"- What you worked on this session (be specific)\n"
        f"- Key decisions made and why\n"
        f"- What's next / where you left off\n\n"
        f"BIDIRECTIONAL TRACES (required):\n"
        f"1. BEFORE writing, search for related entries: `trace-search {brain_path}/memory.md keyword1 keyword2`\n"
        f"2. For each related OLD entry found, EDIT it to add: `↪ trace-forward: [session:{sid}] @{agent_name}: <your new entry title>`\n"
        f"3. In your NEW entry, add back-traces: `↪ trace: relates-to [old-session]: <old entry title>`\n"
        f"4. If no related entries exist, add: `↪ trace: none (new topic)`\n\n"
        f"NOTE: [{project}] is auto-detected from your working directory. Use [universal] for cross-project work.\n\n"
        f"Also update .agent-memory/comms/ACTIVITY.md with a log entry."
        f"{extra_prompts}\n\n"
        f"IMPORTANT: Every entry must have ISO 8601 timestamp + context + session + bidirectional traces.\n"
    )

    # Add tag fix warnings if previous writes are missing tags
    if missing_sids:
        prompt += (
            f"\nWARNING: These files are missing [session:{sid}] tags: {', '.join(missing_sids)}. "
            f"Fix them now.\n"
        )
    if missing_traces:
        prompt += (
            f"\nWARNING: These files are missing ↪ trace: references: {', '.join(missing_traces)}. "
            f"Fix them now.\n"
        )
    if missing_bidirectional:
        prompt += (
            "\nWARNING: Missing reciprocal ↪ trace-forward links:\n"
            + "\n".join(
                f"- {item['file']}: {item['old_ref']} → {item['new_ref']}"
                for item in missing_bidirectional
            )
            + "\nDo not edit protected logs directly. Retry the new entry through agent-log.py with the verified older header or stable reference; the writer adds the matching trace-forward automatically. For an existing strict entry whose trace is none (new topic), use --repair-backward-trace.\n"
        )

    prompt += f"\nWrite quality notes in YOUR voice — not bullet dumps. Then continue your work."

    result = {"continue": True, "additionalContext": prompt}
    print(json.dumps(result))


def handle_stop(hook_input):
    """
    Stop: Activity-weighted gap detection (fires when Claude finishes responding).

    Measures how much work happened since the last brain sync.
    Heavy sessions with no sync → reminds the agent to reconcile.
    Light sessions → passes through silently.

    The reminder is advisory so a long-running task cannot be ended by a
    bookkeeping hook.
    """
    raw_session_id = hook_input.get("session_id", "unknown")
    session_id = raw_session_id  # Keep raw for markers
    sid = get_session_id(raw_session_id)  # Machine-prefixed for prompts
    transcript_path = hook_input.get("transcript_path", "")
    cwd = hook_input.get("cwd", "")

    if has_marker(session_id, "stop"):
        return

    if not transcript_path or not os.path.exists(transcript_path):
        return

    events = parse_transcript(transcript_path)
    if not events:
        set_marker(session_id, "stop")
        return

    agent = detect_agent(events)
    project = detect_project(cwd)

    if not agent:
        set_marker(session_id, "stop")
        return

    # Score activity since last brain sync
    activity = score_activity_since_last_sync(events)
    score = activity["total_score"]
    brain_synced = check_brain_modified(agent, events)
    activity_logged = check_activity_logged(events, cwd)
    agent_name = agent.capitalize()

    # Check brain staleness — if stale, require WAKE entry even for low activity
    staleness = check_brain_staleness(agent)
    brain_is_stale = staleness['is_stale']

    # Check for unsync markers from past sessions
    unsync_markers = get_unsync_markers(agent)
    has_unsync_past = len(unsync_markers) > 0

    # Determine if we need to prompt
    # Trigger if: (activity AND no sync) OR (brain is stale AND no sync) OR (unsync markers exist AND no sync)
    needs_brain_sync = not brain_synced and (score >= ACTIVITY_THRESHOLD_LIGHT or brain_is_stale or has_unsync_past)
    needs_activity_log = not activity_logged and score >= ACTIVITY_THRESHOLD_LIGHT

    # Check session ID tags in written content (even if files were touched)
    missing_session_ids = []
    missing_traces = []
    missing_bidirectional = []
    if (brain_synced or activity_logged) and score >= ACTIVITY_THRESHOLD_LIGHT:
        missing_session_ids = check_session_ids_in_writes(events, session_id)
        missing_traces = check_traces_in_writes(events)
        missing_bidirectional = check_bidirectional_traces(events)["forward_traces_missing"]

    if (
        not needs_brain_sync
        and not needs_activity_log
        and not missing_session_ids
        and not missing_traces
        and not missing_bidirectional
    ):
        # Light session with fresh brain, no unsync markers, or already synced — pass through
        set_marker(session_id, "stop")
        if score < ACTIVITY_THRESHOLD_LIGHT and not brain_is_stale and not has_unsync_past:
            sys.stderr.write(
                f"[brain-sync] Stop: @{agent} / {project} — light session, brain fresh "
                f"(score: {score:.1f}, last entry: {staleness['hours_since_last']}h ago)\n"
            )
        else:
            # Clear any unsync markers since agent synced this session
            for m in unsync_markers:
                clear_unsync_marker(agent, m.get("session_id", ""))
            sys.stderr.write(
                f"[brain-sync] Stop: @{agent} / {project} — already synced "
                f"(score: {score:.1f}), cleared {len(unsync_markers)} unsync markers\n"
            )
        return

    # Build the reconciliation prompt
    severity = "HEAVY" if score >= ACTIVITY_THRESHOLD_HEAVY else "MODERATE"
    files_str = ", ".join(sorted(activity["files_changed"])[:8]) if activity["files_changed"] else "none detected"
    tools_str = ", ".join(f"{t}({c})" for t, c in sorted(activity["tool_counts"].items(), key=lambda x: -x[1])[:5])
    current_ts = get_current_timestamp()

    brain_path = f"~/.agent-memory/agents/{agent}/brain" if agent else "your brain files"

    parts = []

    # Add unsync markers from past sessions if any
    if has_unsync_past:
        unsync_prompt = format_unsync_prompt(unsync_markers, agent_name, current_ts)
        parts.append(unsync_prompt)

    if needs_brain_sync:
        # Determine why we're triggering
        if has_unsync_past and score < ACTIVITY_THRESHOLD_LIGHT and not brain_is_stale:
            trigger_reason = f"UNSYNCED PAST SESSIONS ({len(unsync_markers)} found)"
        elif brain_is_stale and score < ACTIVITY_THRESHOLD_LIGHT:
            trigger_reason = f"Brain is STALE (last entry: {staleness['hours_since_last']}h ago, threshold: {BRAIN_STALE_HOURS}h)"
        else:
            trigger_reason = f"{severity} session activity (score: {score:.1f}, threshold: {ACTIVITY_THRESHOLD_LIGHT})"

        parts.append(
            f"Brain files NOT updated. {trigger_reason}.\n"
            f"Files changed (this session): {files_str}\n"
            f"Tools used (this session): {tools_str}\n\n"
            f"**Entry format (ISO 8601 timestamp required):**\n"
            f"`[{current_ts}] [{project}] @{agent_name} [session:{sid}]: **Title**`\n\n"
            f"@{agent_name}, reconcile your brain/memory.md. "
            f"NOTE: [{project}] is auto-detected — use [universal] for cross-project work.\n\n"
            f"BIDIRECTIONAL TRACES (required):\n"
            f"1. Search for related entries: `trace-search {brain_path}/memory.md keyword1 keyword2`\n"
            f"2. For each related OLD entry, EDIT it to add: `↪ trace-forward: [session:{sid}] @{agent_name}: <your new entry title>`\n"
            f"3. In your NEW entry, add: `↪ trace: relates-to [old-session]: <old entry title>`\n"
            f"4. If no related entries, add: `↪ trace: none (new topic)`"
        )
    if needs_activity_log:
        parts.append(
            f"ACTIVITY.md not updated for project [{project}]. "
            f"Log what you did this session with [session:{sid}] tag."
        )
    if missing_session_ids:
        files_list = ", ".join(missing_session_ids)
        parts.append(
            f"Missing [session:{sid}] tag in: {files_list}. "
            f"Every log entry needs a session tag for traceability. "
            f"Add [session:{sid}] after the bold title in your entries."
        )
    if missing_traces:
        files_list = ", ".join(missing_traces)
        parts.append(
            f"Missing trace references in: {files_list}. "
            f"Use `trace-search <file> keyword1 keyword2` to find related entries, then:\n"
            f"1. Do not edit protected logs directly; write the new entry through agent-log.py with the verified older header or stable [timestamp] @Agent [session:cli:id] reference so it adds trace-forward automatically.\n"
            f"2. If an existing strict entry already has `↪ trace: none (new topic)`, use the approved --repair-backward-trace mode with a verified older target.\n"
            f"If genuinely no related entries exist, add '↪ trace: none (new topic)'."
        )
    if missing_bidirectional:
        parts.append(
            "Missing reciprocal ↪ trace-forward links:\n"
            + "\n".join(
                f"- {item['file']}: {item['old_ref']} → {item['new_ref']}"
                for item in missing_bidirectional
            )
            + "\nDo not edit protected logs directly: retry through agent-log.py, or use --repair-backward-trace for an existing strict none (new topic) entry."
        )

    prompt = (
        f"SESSION END — SYNC CHECK\n\n"
        + "\n\n".join(parts)
    )

    set_marker(session_id, "stop")
    cleanup_old_markers()

    result = {"continue": True, "additionalContext": prompt}
    print(json.dumps(result))

    sys.stderr.write(
        f"[brain-sync] Stop: @{agent} / {project} — "
        f"{'FLAGGED' if needs_brain_sync else 'activity only'} "
        f"(score: {score:.1f}, files: {len(activity['files_changed'])}, "
        f"msgs: {activity['user_message_count']})\n"
    )


# ─── SessionEnd Handler ──────────────────────────────────────────────


def handle_session_end(hook_input):
    """
    SessionEnd: Lightweight marker writer (non-blocking).

    Can't prompt the agent — session is already closing. Instead:
    1. Score the session activity
    2. If heavy + no brain sync → write a JSON marker to UNSYNC_DIR
    3. Heartbeat reads these markers for fast staleness detection

    Marker files = breadcrumbs. Heartbeat = the one who follows them.
    """
    session_id = hook_input.get("session_id", "unknown")
    transcript_path = hook_input.get("transcript_path", "")
    cwd = hook_input.get("cwd", "")

    if has_marker(session_id, "session-end"):
        return

    set_marker(session_id, "session-end")

    if not transcript_path or not os.path.exists(transcript_path):
        return

    events = parse_transcript(transcript_path)
    if not events:
        return

    agent = detect_agent(events)
    project = detect_project(cwd)

    if not agent:
        return

    # Score activity since last brain sync
    activity = score_activity_since_last_sync(events)
    score = activity["total_score"]
    brain_synced = check_brain_modified(agent, events)
    activity_logged = check_activity_logged(events, cwd)

    # Only write marker if there's meaningful unsynced work
    if brain_synced and activity_logged:
        sys.stderr.write(
            f"[brain-sync] SessionEnd: @{agent} / {project} — "
            f"synced (score: {score:.1f})\n"
        )
        return

    if score < ACTIVITY_THRESHOLD_LIGHT:
        sys.stderr.write(
            f"[brain-sync] SessionEnd: @{agent} / {project} — "
            f"light session (score: {score:.1f}), no marker\n"
        )
        return

    # Write the unsync marker — next WAKE will find this and prompt reconciliation
    UNSYNC_DIR.mkdir(parents=True, exist_ok=True)
    marker_data = {
        "session_id": session_id,
        "agent": agent,
        "project": project,
        "score": score,
        "brain_synced": brain_synced,
        "activity_logged": activity_logged,
        "tool_counts": activity["tool_counts"],
        "files_changed": list(activity["files_changed"]),
        "user_messages": activity["user_message_count"],
        "timestamp": get_current_timestamp(),  # ISO 8601 UTC
        "transcript": transcript_path,
    }

    marker_path = UNSYNC_DIR / f"{session_id[:8]}-{agent}.json"
    with open(marker_path, "w", encoding='utf-8') as f:
        json.dump(marker_data, f, indent=2)

    severity = "HEAVY" if score >= ACTIVITY_THRESHOLD_HEAVY else "MODERATE"
    missing = []
    if not brain_synced:
        missing.append("brain")
    if not activity_logged:
        missing.append("activity")

    sys.stderr.write(
        f"[brain-sync] SessionEnd: @{agent} / {project} — "
        f"{severity} session (score: {score:.1f}), "
        f"missing: {'+'.join(missing)}, marker written\n"
    )


# ─── PostToolUse Handler (Context Monitor) ──────────────────────────


def activity_checkpoint_prompt(agent, project, sid, details):
    agent_name = agent.capitalize()
    brain_path = f"~/.agent-memory/agents/{agent}/brain"
    signals = ", ".join(sorted(set(details["checkpoint_signals"])))
    current_ts = get_current_timestamp()
    return (
        f"ACTIVITY CHECKPOINT — soft reminder\n\n"
        f"@{agent_name}, work since your last agent note sync crossed the checkpoint "
        f"(activity score: {details['total_score']:.1f}; signals: {signals}).\n\n"
        f"If this phase produced an important decision, learning, meaningful change, "
        f"blocker, or shipped result, capture a concise entry now in "
        f"{brain_path}/memory.md and the relevant ACTIVITY.md with an ISO timestamp, "
        f"session [{sid}], and bidirectional trace. If the work was genuinely shipped "
        f"and verified, decide whether it also belongs in {brain_path.rsplit('/brain', 1)[0]}/core/portfolio.md; "
        f"do not create a portfolio entry for exploration or incomplete work. If not, continue your work.\n\n"
        f"This reminder is advisory and does not block the task.\n"
        f"Use timestamp format [{current_ts}] and keep the note in your own voice.\n"
    )


def handle_post_tool_use(hook_input):
    """
    PostToolUse: Activity checkpoint and context monitor. Fires after every tool call.

    Before the context threshold, scans only meaningful tool boundaries and
    injects one soft checkpoint per activity phase. At ~70% of a typical 200K
    session, injects the stronger context reminder. Both paths are advisory.
    """
    raw_session_id = hook_input.get("session_id", "unknown")
    session_id = raw_session_id  # Keep raw for markers
    sid = get_session_id(raw_session_id)  # Machine-prefixed for prompts
    transcript_path = hook_input.get("transcript_path", "")
    cwd = hook_input.get("cwd", "")
    tool_name = hook_input.get("tool_name", "")

    # Already fired this session? Skip.
    if has_marker(session_id, "context-monitor"):
        return

    # Quick file size check — no parsing
    if not transcript_path or not os.path.exists(transcript_path):
        return

    try:
        file_size = os.path.getsize(transcript_path)
    except OSError:
        return

    if file_size < TRANSCRIPT_SIZE_THRESHOLD:
        if tool_name in CHECKPOINT_SCAN_TOOLS:
            events = parse_transcript(transcript_path)
            if events:
                details = checkpoint_details(events)
                agent = detect_agent(events)
                if agent and details["checkpoint_bucket"] > 0 and details["checkpoint_signals"]:
                    marker_event = (
                        f"checkpoint-{details['last_sync_index']}-{details['checkpoint_bucket']}"
                    )
                    if not has_marker(session_id, marker_event):
                        set_marker(session_id, marker_event)
                        project = detect_project(cwd)
                        prompt = activity_checkpoint_prompt(agent, project, sid, details)
                        print(json.dumps({"continue": True, "additionalContext": prompt}))
                        sys.stderr.write(
                            f"[brain-sync] PostToolUse: @{agent} / {project} — "
                            f"activity checkpoint ({details['total_score']:.1f}, {', '.join(sorted(set(details['checkpoint_signals'])))})\n"
                        )
                        return
        # Log periodically so agents know the hook is alive (every 2MB)
        if file_size > 2 * 1024 * 1024 and file_size % (2 * 1024 * 1024) < 500_000:
            sys.stderr.write(
                f"[brain-sync] PostToolUse: context at {file_size // (1024*1024)}MB / "
                f"{TRANSCRIPT_SIZE_THRESHOLD // (1024*1024)}MB threshold — monitoring\n"
            )
        return

    # We're at ~70%. Set marker so we don't fire again this session.
    set_marker(session_id, "context-monitor")

    # Detect agent and project for the prompt
    events = parse_transcript(transcript_path)
    agent = detect_agent(events) if events else None
    project = detect_project(cwd)

    # Check if agent already synced their brain recently
    if agent and check_brain_modified(agent, events):
        # Still check for missing tags even if brain was synced
        missing_sids = check_session_ids_in_writes(events, session_id)
        missing_traces = check_traces_in_writes(events)
        if missing_sids or missing_traces:
            sys.stderr.write(
                f"[brain-sync] PostToolUse: @{agent} / {project} — "
                f"context at ~70%, brain synced but missing tags "
                f"(sids: {missing_sids}, traces: {missing_traces})\n"
            )
            # Fall through to prompt for tag fixes
        else:
            sys.stderr.write(
                f"[brain-sync] PostToolUse: @{agent} / {project} — "
                f"context at ~70% ({file_size // (1024*1024)}MB) but brain already synced ✓\n"
            )
            return

    agent_name = agent.capitalize() if agent else "Agent"
    brain_path = f"~/.agent-memory/agents/{agent}/brain" if agent else "your brain files"

    # Detect which additional body files need updating based on session activity
    extra_files = detect_body_file_needs(events)
    extra_prompts = ""
    if extra_files:
        extra_prompts = "\n\nAlso update these based on session activity:\n"
        for filepath, reason in extra_files:
            extra_prompts += f"- {brain_path.rsplit('/brain', 1)[0]}/{filepath}: {reason}\n"

    current_ts = get_current_timestamp()

    prompt = (
        f"CONTEXT MONITOR — You are at ~70% of the context window.\n\n"
        f"@{agent_name}, sync your brain files NOW. Claude CLI will auto-compact "
        f"at 98% and you'll lose detailed context. Write durable notes while you "
        f"still have full recall.\n\n"
        f"This is session [{sid}] in project [{project}].\n\n"
        f"**Entry format (ISO 8601 timestamp required):**\n"
        f"`[{current_ts}] [{project}] @{agent_name} [session:{sid}]: **Title**`\n\n"
        f"Write to {brain_path}/memory.md:\n"
        f"- What you've worked on so far (be specific)\n"
        f"- Key decisions made and why\n"
        f"- Current state and what's next\n\n"
        f"BIDIRECTIONAL TRACES (required):\n"
        f"1. Search for related entries: `trace-search {brain_path}/memory.md keyword1 keyword2`\n"
        f"2. For each related OLD entry, EDIT it to add: `↪ trace-forward: [session:{sid}] @{agent_name}: <your new entry title>`\n"
        f"3. In your NEW entry, add: `↪ trace: relates-to [old-session]: <old entry title>`\n"
        f"4. If no related entries, add: `↪ trace: none (new topic)`\n\n"
        f"NOTE: [{project}] is auto-detected — use [universal] for cross-project work.\n\n"
        f"Also update .agent-memory/comms/ACTIVITY.md with a log entry."
        f"{extra_prompts}\n\n"
        f"IMPORTANT: Every entry must have ISO 8601 timestamp + context + session + bidirectional traces.\n\n"
        f"Write quality notes, then continue your work."
    )

    result = {"continue": True, "additionalContext": prompt}
    print(json.dumps(result))

    sys.stderr.write(
        f"[brain-sync] PostToolUse: @{agent_name} / {project} — "
        f"CONTEXT MONITOR triggered ({file_size // (1024*1024)}MB, "
        f"threshold {TRANSCRIPT_SIZE_THRESHOLD // (1024*1024)}MB)\n"
    )


# ─── Main ─────────────────────────────────────────────────────────────


def main():
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    try:
        event = hook_input.get("hook_event_name", "")

        if event == "PreCompact":
            handle_pre_compact(hook_input)
        elif event == "PostToolUse":
            handle_post_tool_use(hook_input)
        elif event == "Stop":
            handle_stop(hook_input)
        elif event == "SessionEnd":
            handle_session_end(hook_input)

        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == "__main__":
    main()
