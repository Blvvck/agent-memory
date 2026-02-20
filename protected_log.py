import os
import re
import stat
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

try:
    import fcntl
except ImportError:
    fcntl = None


class ProtectedLogError(ValueError):
    pass


@dataclass(frozen=True)
class LogPolicy:
    name: str
    require_context: bool
    ordering: str | None


@dataclass(frozen=True)
class Entry:
    header: str
    prefix: str
    timestamp: datetime
    start: int
    body_start: int
    end: int
    body: str
    context: str | None
    agent: str
    session: str
    strict: bool


HEADER_RE = re.compile(
    r"^(?P<prefix>(?:[-*]\s+)?)\[(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]"
    r"(?: \[(?P<context>[A-Za-z0-9][A-Za-z0-9._-]*)\])?"
    r" @(?P<agent>[A-Za-z][A-Za-z0-9_-]*)"
    r" \[session:(?P<session>(?P<cli>claude|codex|agy|antigravity|opencode):"
    r"(?P<session_id>[A-Za-z0-9][A-Za-z0-9._-]*))\]: (?P<title>\S.*)$",
    re.MULTILINE,
)
LEGACY_HEADER_RE = re.compile(
    r"^(?P<prefix>(?:[-*]\s+)?)\[(?P<timestamp>\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\]"
    r"(?P<tags>(?:\s+\[[^\]]+\])*)\s+@(?P<agent>[A-Za-z][A-Za-z0-9_-]*)"
    r"\s+\[session:(?P<session>[^\]]+)\](?:\s+\[[^\]]+\])?:\s+(?P<title>\S.*)$",
    re.MULTILINE,
)
DATE_LINE_RE = re.compile(r"^\s*(?:[-*]\s*)?\[\d{4}-\d{2}-\d{2}")
TRACE_RE = re.compile(r"^\s*(?:[-*]\s*)?↪\s*trace:\s*(?P<value>.+?)\s*$", re.MULTILINE)
FORWARD_RE = re.compile(r"^\s*(?:[-*]\s*)?↪\s*trace-forward:\s*(?P<value>.+?)\s*$", re.MULTILINE)
INVALID_SESSION_PARTS = {"unknown", "current", "placeholder", "dummy", "test", "fake"}
INVALID_TRACE_VALUES = {"todo", "tbd", "pending", "add later", "placeholder"}
PROTECTED_LOG_NAMES = {"MEMORY.MD", "LEARNINGS.MD", "PATTERNS.MD", "ACTIVITY.MD", "NOTIFICATIONS.MD"}
TRACE_REFERENCE_RE = re.compile(
    r"^\s*(?:[-*]\s+)?\[(?P<timestamp>\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\]"
    r"(?:\s+\[[^\]]+\])?"
    r"(?:\s+@(?P<agent>[A-Za-z][A-Za-z0-9_-]*)"
    r"(?:\s+\[session:(?P<session>[^\]]+)\])?)?\s*$"
)
DROPPED_HEADER_RE = re.compile(
    r"^(?:[-*]\s+)?(?:\[(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\])?"
    r"(?:\s*\[[A-Za-z0-9][A-Za-z0-9._-]*\])*"
    r"\s*@(?P<agent>[A-Za-z][A-Za-z0-9_-]*)"
    r"\s*\[session:(?P<session>(?:claude|codex|agy|antigravity|opencode):"
    r"[A-Za-z0-9][A-Za-z0-9._-]*)\]:\s*$"
)
REPAIR_GUIDANCE = (
    "Pass --header with the entry's current header line exactly as it appears in the log, "
    "and --replacement with the same line minus only the pasted header fragment at the start "
    "of the subject. Timestamp, project tag, agent, session and every other character must "
    "stay identical, and the dropped fragment must itself be a writer header for this same "
    "agent and session"
)


def policy_for_path(path):
    canonical = Path(path).expanduser().resolve()
    name = canonical.name.upper()
    if name == "PATTERNS.MD":
        return LogPolicy(name="patterns", require_context=True, ordering=None)
    if name == "ACTIVITY.MD":
        global_activity = canonical == Path.home().resolve() / ".agent-memory" / "comms" / "ACTIVITY.md"
        return LogPolicy(name="activity", require_context=global_activity, ordering="newest")
    if name == "NOTIFICATIONS.MD":
        return LogPolicy(name="notifications", require_context=True, ordering="newest")
    if name in {"MEMORY.MD", "LEARNINGS.MD"}:
        return LogPolicy(name=name.lower()[:-3], require_context=True, ordering="newest")
    raise ProtectedLogError(f"unrecognized protected log: {path}")


def _git_main_root(path):
    raw = Path(path)
    cursor = raw if raw.is_dir() else raw.parent
    for candidate in (cursor, *cursor.parents):
        marker = candidate / ".git"
        if marker.is_dir():
            return marker.parent.resolve()
        if not marker.is_file():
            continue
        try:
            line = marker.read_text(encoding="utf-8").strip()
        except (OSError, UnicodeError):
            return None
        if not line.startswith("gitdir:"):
            return None
        gitdir = Path(line.split(":", 1)[1].strip())
        if not gitdir.is_absolute():
            gitdir = candidate / gitdir
        gitdir = gitdir.resolve()
        try:
            return gitdir.parents[2]
        except IndexError:
            return None
    return None


def canonical_protected_log_path(path):
    raw = Path(path).expanduser()
    if not raw.is_absolute():
        raw = Path.cwd() / raw
    raw = raw.absolute()
    canonical = raw.resolve()
    if canonical.name.upper() not in PROTECTED_LOG_NAMES:
        return canonical
    agent_memory_dir = next((parent for parent in (raw, *raw.parents) if parent.name == ".agent-memory"), None)
    project_root = _git_main_root(raw)
    if agent_memory_dir is not None and project_root is not None:
        expected = (project_root / ".agent-memory").resolve()
        actual = agent_memory_dir.resolve()
        if actual != expected:
            raise ProtectedLogError(
                "protected log must use the canonical project .agent-memory at "
                f"{expected}; worktree-local .agent-memory is not allowed ({agent_memory_dir}). "
                "Use the main checkout path or symlink the worktree .agent-memory to it."
            )
    return canonical


def _parse_timestamp(value):
    fmt = "%Y-%m-%dT%H:%M:%SZ" if "T" in value else "%Y-%m-%d"
    return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)


def _valid_session(session):
    parts = session.split(":", 1)
    if len(parts) != 2 or parts[0] not in {"claude", "codex", "agy", "antigravity", "opencode"}:
        return False
    lowered = parts[1].lower()
    return bool(parts[1]) and not any(part in lowered for part in INVALID_SESSION_PARTS)


def _lines(text):
    return text.splitlines(keepends=True)


def _line_end(text, start):
    newline = text.find("\n", start)
    return len(text) if newline == -1 else newline


def _entries(text, policy, allow_legacy=False):
    if not isinstance(text, str):
        raise ProtectedLogError("protected log content must be text")
    matches = []
    for match in HEADER_RE.finditer(text):
        context = match.group("context")
        session = match.group("session")
        strict_context = (not policy.require_context or context) and (policy.require_context or not context)
        if strict_context and _valid_session(session):
            matches.append(match)
    entries = []
    for line in _lines(text):
        candidate = line.rstrip("\r\n")
        if (
            not allow_legacy
            and DATE_LINE_RE.match(candidate)
            and "↪" not in candidate
            and not HEADER_RE.match(candidate)
        ):
            raise ProtectedLogError("malformed timestamped entry metadata")
    parsed_matches = [(match, True) for match in matches]
    if allow_legacy:
        strict_spans = {match.span() for match in matches}
        for legacy in LEGACY_HEADER_RE.finditer(text):
            if legacy.span() not in strict_spans:
                parsed_matches.append((legacy, False))
        parsed_matches.sort(key=lambda item: item[0].start())
    for index, (match, strict) in enumerate(parsed_matches):
        line_end = _line_end(text, match.start())
        next_start = parsed_matches[index + 1][0].start() if index + 1 < len(parsed_matches) else len(text)
        context = match.groupdict().get("context")
        if not strict and not context:
            tags = match.groupdict().get("tags") or ""
            tag_matches = re.findall(r"\[([^\]]+)\]", tags)
            context = tag_matches[0] if tag_matches else None
        session = match.group("session")
        title = match.group("title")
        if strict and policy.require_context and not context:
            raise ProtectedLogError("entry context is required")
        if strict and not policy.require_context and context:
            raise ProtectedLogError("project-scoped entry may not contain context")
        if strict and not _valid_session(session):
            raise ProtectedLogError("entry session metadata is invalid")
        if not title.strip():
            raise ProtectedLogError("entry title is empty")
        entries.append(
            Entry(
                header=match.group(0),
                prefix=match.group("prefix"),
                timestamp=_parse_timestamp(match.group("timestamp")),
                start=match.start(),
                body_start=line_end + (1 if line_end < len(text) else 0),
                end=next_start,
                body=text[line_end + (1 if line_end < len(text) else 0):next_start],
                context=context,
                agent=match.group("agent"),
                session=session,
                strict=strict,
            )
        )
    return entries


def _validate_entry_headers(entries, policy, allow_legacy=False):
    if not allow_legacy:
        identities = [entry.header for entry in entries]
        if len(identities) != len(set(identities)):
            raise ProtectedLogError("duplicate entry identity")
    if policy.ordering == "newest" and not allow_legacy:
        ordered_entries = entries
        for previous, current in zip(ordered_entries, ordered_entries[1:]):
            if previous.timestamp < current.timestamp:
                raise ProtectedLogError("entries are not newest-first")


def _validate_trace_syntax(entries):
    for entry in entries:
        for match in TRACE_RE.finditer(entry.body):
            value = match.group("value").strip().lower()
            if value in INVALID_TRACE_VALUES or not value:
                raise ProtectedLogError("invalid backward trace")
        for match in FORWARD_RE.finditer(entry.body):
            if not match.group("value").strip():
                raise ProtectedLogError("invalid forward trace")


def validate_document(text, policy, allow_legacy=False):
    entries = _entries(text, policy, allow_legacy=allow_legacy)
    _validate_entry_headers(entries, policy, allow_legacy=allow_legacy)
    _validate_trace_syntax(entries)
    return entries


def _preamble(text, entries):
    return text if not entries else text[:entries[0].start]


def _trace_target(body):
    traces = list(TRACE_RE.finditer(body))
    forwards = list(FORWARD_RE.finditer(body))
    if forwards:
        raise ProtectedLogError("new entry may not contain trace-forward")
    if len(traces) != 1:
        raise ProtectedLogError("new entry needs exactly one backward trace")
    value = traces[0].group("value").strip()
    if value == "none (new topic)":
        return None
    prefix = "relates-to "
    if not value.startswith(prefix) or not value[len(prefix):].strip():
        raise ProtectedLogError("backward trace must resolve with relates-to or none")
    return value[len(prefix):].strip()


def _trace_display(header):
    return re.sub(r"^(?:[-*]\s+)", "", header)


def _stable_reference(reference):
    match = TRACE_REFERENCE_RE.fullmatch(reference)
    if not match:
        return None
    return {
        "timestamp": match.group("timestamp"),
        "agent": match.group("agent"),
        "session": match.group("session"),
    }


def _resolve_target(reference, entries):
    candidates = [entry for entry in entries if entry.header == reference]
    if not candidates:
        candidates = [entry for entry in entries if _trace_display(entry.header) == reference]
    if not candidates:
        stable = _stable_reference(reference)
        if stable:
            timestamp = _parse_timestamp(stable["timestamp"])
            if "T" in stable["timestamp"]:
                candidates = [entry for entry in entries if entry.timestamp == timestamp]
            else:
                candidates = [entry for entry in entries if entry.timestamp.date() == timestamp.date()]
            if stable["agent"]:
                candidates = [entry for entry in candidates if entry.agent == stable["agent"]]
            if stable["session"]:
                candidates = [entry for entry in candidates if entry.session == stable["session"]]
    if not candidates:
        raise ProtectedLogError(
            "backward trace target does not resolve; use a complete existing header or "
            "[timestamp] @Agent [session:cli:id]"
        )
    if len(candidates) > 1:
        raise ProtectedLogError("backward trace target is ambiguous")
    return candidates[0].header


def _forward_suffix(old_body, new_body, new_header):
    if not new_body.startswith(old_body):
        raise ProtectedLogError("historical entry prose changed")
    suffix = new_body[len(old_body):]
    expected = f"  - ↪ trace-forward: {_trace_display(new_header)}"
    if suffix not in {expected, expected + "\n", "\n" + expected, "\n" + expected + "\n"}:
        raise ProtectedLogError("historical entry changed outside its permitted forward trace")
    return expected


def validate_mutation(before, after, policy, allow_legacy=False):
    old_entries = validate_document(before, policy, allow_legacy=allow_legacy)
    new_entries = validate_document(after, policy, allow_legacy=allow_legacy)
    if _preamble(before, old_entries) != _preamble(after, new_entries):
        raise ProtectedLogError("protected log preamble changed")
    old_headers = [entry.header for entry in old_entries]
    new_headers = [entry.header for entry in new_entries]
    added = [entry for entry in new_entries if entry.header not in set(old_headers)]
    if len(added) != 1:
        raise ProtectedLogError("mutation must add exactly one entry")
    added_entry = added[0]
    if any(header not in new_headers for header in old_headers):
        raise ProtectedLogError("historical entry was removed")
    historical_headers = new_headers[:]
    historical_headers.pop(new_headers.index(added_entry.header))
    if historical_headers != old_headers:
        raise ProtectedLogError("historical entries were reordered")
    added_position = new_headers.index(added_entry.header)
    if policy.ordering == "newest" and added_position != 0:
        raise ProtectedLogError("new chronological entry must be first")
    if policy.ordering is None and old_entries and added_position == len(new_entries) - 1:
        raise ProtectedLogError("new topic entry may not be appended at the bottom")
    if old_entries and policy.ordering == "newest" and added_entry.timestamp < max(entry.timestamp for entry in old_entries):
        raise ProtectedLogError("new entry timestamp regresses")
    target = _trace_target(added_entry.body)
    old_by_header = {entry.header: entry for entry in old_entries}
    new_by_header = {entry.header: entry for entry in new_entries}
    if target is not None:
        target = _resolve_target(target, old_entries)
    for header, old_entry in old_by_header.items():
        current_entry = new_by_header[header]
        if target == header:
            if FORWARD_RE.search(old_entry.body):
                expected = f"  - ↪ trace-forward: {_trace_display(added_entry.header)}"
                if expected in old_entry.body:
                    raise ProtectedLogError("duplicate reciprocal forward trace")
            _forward_suffix(old_entry.body, current_entry.body, added_entry.header)
        elif current_entry.body != old_entry.body:
            raise ProtectedLogError("historical entry changed")
    if target is None:
        if any(new_by_header[header].body != old_entry.body for header, old_entry in old_by_header.items()):
            raise ProtectedLogError("none exception cannot change historical entries")
    else:
        if target not in old_by_header:
            raise ProtectedLogError("backward trace target does not resolve")
        if added_entry.timestamp <= old_by_header[target].timestamp:
            raise ProtectedLogError("backward trace target is not older than new entry")
        expected = f"  - ↪ trace-forward: {_trace_display(added_entry.header)}"
        if expected not in new_by_header[target].body:
            raise ProtectedLogError("reciprocal trace-forward is missing")
    return new_entries


def _canonical_project(path, runtime):
    supplied = runtime.get("project")
    canonical = Path(path).expanduser().resolve()
    home_claude = Path.home().resolve() / ".agent-memory"
    try:
        relative = canonical.relative_to(home_claude)
        derived = "universal"
        # Global brain files hold an agent's memory across every project, so entries keep
        # the project they are about instead of the path-derived "universal".
        if supplied and len(relative.parts) == 4 and relative.parts[0] == "agents" and relative.parts[2] == "brain":
            derived = None
    except ValueError:
        parts = canonical.parts
        if ".agent-memory" not in parts:
            derived = None
        else:
            marker = len(parts) - 1 - parts[::-1].index(".agent-memory")
            derived = parts[marker - 1] if marker > 0 else None
    project = str(supplied or derived or "").strip()
    if not project or project in {"unknown", "current", "placeholder"}:
        raise ProtectedLogError("project metadata is missing or invalid")
    if supplied and derived and supplied != derived and not (derived == "universal" and supplied == "universal"):
        raise ProtectedLogError("project metadata does not match canonical target path")
    return project


def _metadata(path, runtime):
    if not isinstance(runtime, dict):
        raise ProtectedLogError("runtime metadata must be a payload object")
    session_id = str(runtime.get("session_id") or os.environ.get("CODEX_SESSION_ID") or os.environ.get("AGENT_SESSION_ID") or "").strip()
    cli = str(runtime.get("cli") or runtime.get("runtime") or os.environ.get("AGENT_CLI") or "").strip().lower()
    if ":" in session_id:
        session_prefix, raw_session_id = session_id.split(":", 1)
        if cli and cli != session_prefix.lower():
            raise ProtectedLogError("runtime CLI and session metadata disagree")
        cli = cli or session_prefix.lower()
        session_id = raw_session_id
    if cli not in {"claude", "codex", "agy", "antigravity", "opencode"}:
        raise ProtectedLogError("runtime CLI metadata is missing or invalid")
    session = f"{cli}:{session_id}"
    if not _valid_session(session):
        raise ProtectedLogError("runtime session metadata is missing or invalid")
    agent = str(runtime.get("agent") or runtime.get("active_agent") or os.environ.get("AGENT_NAME") or "").strip()
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]*", agent):
        raise ProtectedLogError("active agent metadata is missing or invalid")
    project = _canonical_project(path, runtime)
    return project, agent, session


def _timestamp(clock):
    value = clock() if clock else datetime.now(timezone.utc)
    if not isinstance(value, datetime) or value.tzinfo is None:
        raise ProtectedLogError("writer clock must return an aware datetime")
    return value.astimezone(timezone.utc).replace(microsecond=0)


def _render_entry(path, content, runtime, trace, policy, clock, prefix=""):
    if not isinstance(content, str) or not content.strip():
        raise ProtectedLogError("entry content is empty")
    if any(TRACE_RE.match(line) or FORWARD_RE.match(line) for line in content.splitlines()):
        raise ProtectedLogError("writer owns trace lines")
    project, agent, session = _metadata(path, runtime)
    stamp = _timestamp(clock)
    context = f" [{project}]" if policy.require_context else ""
    first, *rest = content.strip("\n").splitlines()
    header = prefix + f"[{stamp.strftime('%Y-%m-%dT%H:%M:%SZ')}]" + context + f" @{agent} [session:{session}]: {first}"
    body = "\n".join(rest)
    return header, body


def _insert_forward(text, entries, target, new_header):
    matches = [entry for entry in entries if entry.header == target]
    if not matches:
        raise ProtectedLogError("backward trace target does not resolve")
    if len(matches) > 1:
        raise ProtectedLogError("backward trace target is ambiguous")
    old_entry = matches[0]
    expected = f"  - ↪ trace-forward: {_trace_display(new_header)}"
    if expected in old_entry.body:
        raise ProtectedLogError("reciprocal trace-forward already exists")
    addition = expected + "\n" if old_entry.body.endswith("\n") else "\n" + expected + "\n"
    return text[:old_entry.end] + addition + text[old_entry.end:]


def _atomic_write(path, text):
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else None
    fd, name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        if mode is not None:
            os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def _lock(path):
    lock_path = path.with_name(path.name + ".lock")
    with open(lock_path, "a+b") as handle:
        if fcntl is not None:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        else:
            import msvcrt

            handle.seek(0)
            if not handle.read(1):
                handle.seek(0)
                handle.write(b"0")
                handle.flush()
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
        try:
            yield
        finally:
            if fcntl is not None:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            else:
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)


def write_entry(path, content, runtime, trace, policy=None, clock=None):
    canonical = canonical_protected_log_path(path)
    selected_policy = policy or policy_for_path(canonical)
    if not canonical.parent.exists():
        raise ProtectedLogError("protected log parent does not exist")
    with _lock(canonical):
        try:
            before = canonical.read_text(encoding="utf-8") if canonical.exists() else ""
        except (OSError, UnicodeError) as error:
            raise ProtectedLogError(f"cannot read protected log: {error}") from error
        old_entries = validate_document(before, selected_policy, allow_legacy=True)
        prefix = old_entries[0].prefix if old_entries else ""
        header, body = _render_entry(canonical, content, runtime, trace, selected_policy, clock, prefix)
        if trace == "none (new topic)":
            target = None
        elif isinstance(trace, str) and trace.strip():
            target = _resolve_target(trace.strip(), old_entries)
        else:
            raise ProtectedLogError("new entry needs a backward trace or exact none exception")
        trace_line = "  - ↪ trace: none (new topic)" if target is None else f"  - ↪ trace: relates-to {_trace_display(target)}"
        rendered = header + "\n" + body + ("\n" if body else "") + trace_line + "\n\n"
        updated = before
        if target is not None:
            updated = _insert_forward(updated, old_entries, target, header)
        insertion = old_entries[0].start if old_entries else len(updated)
        after = updated[:insertion] + rendered + updated[insertion:]
        validate_mutation(before, after, selected_policy, allow_legacy=True)
        try:
            _atomic_write(canonical, after)
        except OSError as error:
            raise ProtectedLogError(f"atomic protected-log write failed: {error}") from error
    return header


def repair_backward_trace(path, header, trace, runtime, policy=None):
    """Repair one writer-created new-topic trace and its reciprocal edge."""
    canonical = canonical_protected_log_path(path)
    selected_policy = policy or policy_for_path(canonical)
    if not isinstance(header, str) or not header.strip():
        raise ProtectedLogError("repair source header is required")
    if not isinstance(trace, str) or not trace.strip() or trace.strip() == "none (new topic)":
        raise ProtectedLogError("repair target must be an older entry reference")
    _metadata(canonical, runtime)
    with _lock(canonical):
        try:
            before = canonical.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as error:
            raise ProtectedLogError(f"cannot read protected log: {error}") from error
        old_entries = validate_document(before, selected_policy, allow_legacy=True)
        source_header = _resolve_target(header.strip(), old_entries)
        target_header = _resolve_target(trace.strip(), old_entries)
        source = next(entry for entry in old_entries if entry.header == source_header)
        target = next(entry for entry in old_entries if entry.header == target_header)
        if not source.strict:
            raise ProtectedLogError("repair source entry must use strict writer metadata")
        if source.timestamp <= target.timestamp:
            raise ProtectedLogError("repair target must be older than source entry")
        traces = list(TRACE_RE.finditer(source.body))
        if len(traces) != 1 or traces[0].group("value").strip() != "none (new topic)":
            raise ProtectedLogError("repair source entry must contain exactly one none (new topic) trace")
        trace_match = traces[0]
        replacement = f"relates-to {_trace_display(target_header)}"
        absolute_start = source.body_start + trace_match.start("value")
        absolute_end = source.body_start + trace_match.end("value")
        updated = before[:absolute_start] + replacement + before[absolute_end:]
        updated_entries = validate_document(updated, selected_policy, allow_legacy=True)
        updated = _insert_forward(updated, updated_entries, target_header, source_header)
        new_entries = validate_document(updated, selected_policy, allow_legacy=True)
        if [entry.header for entry in new_entries] != [entry.header for entry in old_entries]:
            raise ProtectedLogError("trace repair changed entry identities or ordering")
        for old_entry, new_entry in zip(old_entries, new_entries):
            if old_entry.header == source_header:
                expected_body = old_entry.body[:trace_match.start("value")] + replacement + old_entry.body[trace_match.end("value"):]
                if new_entry.body != expected_body:
                    raise ProtectedLogError("trace repair changed source entry outside its backward trace")
            elif old_entry.header == target_header:
                _forward_suffix(old_entry.body, new_entry.body, source_header)
            elif old_entry.body != new_entry.body:
                raise ProtectedLogError("trace repair changed an unrelated historical entry")
        if _preamble(before, old_entries) != _preamble(updated, new_entries):
            raise ProtectedLogError("protected log preamble changed")
        try:
            _atomic_write(canonical, updated)
        except OSError as error:
            raise ProtectedLogError(f"atomic protected-log repair failed: {error}") from error
    return source_header


def repair_bullet_trace_markers(path, header, policy=None):
    canonical = canonical_protected_log_path(path)
    selected_policy = policy or policy_for_path(canonical)
    with _lock(canonical):
        before = canonical.read_text(encoding="utf-8")
        entries = validate_document(before, selected_policy, allow_legacy=True)
        matches = [entry for entry in entries if entry.header == header]
        if len(matches) != 1:
            raise ProtectedLogError("repair header must resolve to exactly one entry")
        entry = matches[0]
        original = before[entry.start:entry.end]
        repaired = original.replace("↪ trace: relates-to - ", "↪ trace: relates-to ")
        repaired = repaired.replace("↪ trace-forward: - ", "↪ trace-forward: ")
        if repaired == original:
            raise ProtectedLogError("entry has no bullet-prefixed trace markers to repair")
        after = before[:entry.start] + repaired + before[entry.end:]
        validate_document(after, selected_policy, allow_legacy=True)
        _atomic_write(canonical, after)


def _header_fields(header):
    match = HEADER_RE.fullmatch(header)
    if not match:
        raise ProtectedLogError(
            "repair replacement is not a complete entry header, so it cannot be compared with the "
            "one it replaces. It must keep the leading "
            "'[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:<cli>:<id>]: ' exactly as the entry "
            f"has it and change only the text after that colon. {REPAIR_GUIDANCE}"
        )
    groups = match.groupdict()
    return tuple(groups[name] for name in ("prefix", "timestamp", "context", "agent", "session", "title"))


def _resolve_repair_entry(reference, entries):
    """Accept the full header line or a stable reference, because long headers carry shell-hostile text."""
    matches = [entry for entry in entries if entry.header == reference]
    if not matches:
        matches = [entry for entry in entries if _trace_display(entry.header) == reference]
    if not matches:
        stable = _stable_reference(reference)
        if stable:
            timestamp = _parse_timestamp(stable["timestamp"])
            if "T" in stable["timestamp"]:
                matches = [entry for entry in entries if entry.timestamp == timestamp]
            else:
                matches = [entry for entry in entries if entry.timestamp.date() == timestamp.date()]
            if stable["agent"]:
                matches = [entry for entry in matches if entry.agent == stable["agent"]]
            if stable["session"]:
                matches = [entry for entry in matches if entry.session == stable["session"]]
    if not matches:
        raise ProtectedLogError(
            "repair header does not resolve to an entry: nothing in this log matches it. Pass the "
            "entry's full header line exactly as it appears, or a unique "
            "'[timestamp] @Agent [session:<cli>:<id>]' reference to one entry. " + REPAIR_GUIDANCE
        )
    if len(matches) > 1:
        raise ProtectedLogError(
            f"repair header is ambiguous: {len(matches)} entries match it. Add the complete "
            "timestamp, agent and session to the reference so that exactly one entry matches. "
            + REPAIR_GUIDANCE
        )
    return matches[0]


def repair_entry_header(path, header, replacement, runtime, policy=None):
    """Drop a nested writer header from one entry's subject and from every trace quoting it."""
    canonical = canonical_protected_log_path(path)
    selected_policy = policy or policy_for_path(canonical)
    if not isinstance(header, str) or not header.strip():
        raise ProtectedLogError(f"repair header is required: {REPAIR_GUIDANCE}")
    if not isinstance(replacement, str) or not replacement.strip():
        raise ProtectedLogError(f"repair replacement is required: {REPAIR_GUIDANCE}")
    _project, agent, _session = _metadata(canonical, runtime)
    header = header.strip()
    replacement = replacement.strip()
    with _lock(canonical):
        try:
            before = canonical.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as error:
            raise ProtectedLogError(f"cannot read protected log: {error}") from error
        old_entries = validate_document(before, selected_policy, allow_legacy=True)
        entry = _resolve_repair_entry(header, old_entries)
        if not entry.strict:
            raise ProtectedLogError(
                "repair source entry predates the writer contract, so its header cannot be rewritten "
                "safely; only entries written by agent-log carry the metadata this repair verifies. "
                "Leave that line as it is and remove it by hand only as part of a rewrite the writer "
                "performs; nothing you can pass here will fix it"
            )
        if entry.agent != agent:
            raise ProtectedLogError(
                f"agents may repair only their own entries; this entry belongs to @{entry.agent}. "
                f"Ask @{entry.agent} to run it with --agent {entry.agent} and their own session"
            )
        if not replacement.startswith(entry.prefix):
            replacement = entry.prefix + replacement
        old_fields = _header_fields(entry.header)
        new_fields = _header_fields(replacement)
        if new_fields[:5] != old_fields[:5]:
            names = ("prefix", "timestamp", "project", "agent", "session")
            kept = [
                f"{name} must stay {old_value!r} (got {new_value!r})"
                for name, old_value, new_value in zip(names, old_fields[:5], new_fields[:5])
                if old_value != new_value
            ]
            raise ProtectedLogError(
                "repair may not change entry metadata: "
                + "; ".join(kept)
                + f". {REPAIR_GUIDANCE}"
            )
        old_title = old_fields[5]
        new_title = new_fields[5]
        if not old_title.endswith(new_title) or new_title == old_title:
            raise ProtectedLogError(
                "repair may only drop a leading segment of the subject: the replacement subject "
                f"must be the tail of {old_title!r}, but {new_title!r} is not. {REPAIR_GUIDANCE}"
            )
        dropped = old_title[: len(old_title) - len(new_title)]
        dropped_match = DROPPED_HEADER_RE.match(dropped)
        if not dropped_match:
            raise ProtectedLogError(
                "repair may only drop a nested entry header from the subject: "
                f"{dropped!r} is not one. A dropped fragment must end with "
                "'@Agent [session:<cli>:<id>]: ' where <cli> is claude, codex, agy, antigravity "
                "or opencode, optionally preceded by a timestamp and project tags. "
                f"If your fragment has another shape it cannot be repaired this way; {REPAIR_GUIDANCE}"
            )
        dropped_timestamp = dropped_match.group("timestamp")
        if dropped_timestamp and dropped_timestamp != old_fields[1]:
            raise ProtectedLogError(
                "repair dropped a header from a different entry: the fragment's timestamp is "
                f"{dropped_timestamp} but this entry's is {old_fields[1]}. Remove only the copy of "
                f"this entry's own header. {REPAIR_GUIDANCE}"
            )
        if dropped_match.group("agent") != entry.agent:
            raise ProtectedLogError(
                "repair dropped a header for a different agent: the fragment names "
                f"@{dropped_match.group('agent')} but this entry belongs to @{entry.agent}. "
                f"Remove only the copy of this entry's own header. {REPAIR_GUIDANCE}"
            )
        dropped_session = dropped_match.group("session")
        if not entry.session.startswith(dropped_session):
            raise ProtectedLogError(
                "repair dropped a header with a different session: the fragment names session "
                f"{dropped_session!r} but this entry's session is {entry.session!r}. The fragment "
                "must repeat this entry's own session, in full or as a prefix; otherwise there is "
                "no way to tell it came from this entry. " + REPAIR_GUIDANCE
            )
        if replacement in {item.header for item in old_entries}:
            raise ProtectedLogError(
                "repair replacement duplicates an existing entry: another entry already uses that "
                "exact header. Drop the whole pasted fragment, not part of it"
            )
        old_display = _trace_display(entry.header)
        new_display = _trace_display(replacement)

        def _rewrite_trace_lines(text):
            def _drop(match):
                return match.group(0).replace(old_display, new_display)

            return FORWARD_RE.sub(_drop, TRACE_RE.sub(_drop, text))

        updated = before[: entry.start] + replacement + before[entry.start + len(entry.header):]
        updated = _rewrite_trace_lines(updated)
        new_entries = validate_document(updated, selected_policy, allow_legacy=True)
        expected_headers = [
            replacement if item.header == entry.header else item.header for item in old_entries
        ]
        if [item.header for item in new_entries] != expected_headers:
            raise ProtectedLogError("repair changed entry identities or ordering")
        expected_bodies = [_rewrite_trace_lines(item.body) for item in old_entries]
        if [item.body for item in new_entries] != expected_bodies:
            raise ProtectedLogError("repair changed text outside the header and its trace references")
        if _preamble(before, old_entries) != _preamble(updated, new_entries):
            raise ProtectedLogError("protected log preamble changed")
        if old_display in updated:
            raise ProtectedLogError("repair left a stale reference to the old header")
        try:
            _atomic_write(canonical, updated)
        except OSError as error:
            raise ProtectedLogError(f"atomic protected-log repair failed: {error}") from error
    return replacement


def _is_global_brain_file(canonical):
    home_claude = Path.home().resolve() / ".agent-memory"
    try:
        relative = canonical.relative_to(home_claude)
    except ValueError:
        return False
    return len(relative.parts) == 4 and relative.parts[0] == "agents" and relative.parts[2] == "brain"


def retag_entry(path, header, runtime, policy=None):
    """Change one entry's project tag and every trace in the file that quotes its header."""
    canonical = canonical_protected_log_path(path)
    if not _is_global_brain_file(canonical):
        raise ProtectedLogError("retag applies only to global brain files under ~/.agent-memory/agents/<agent>/brain/")
    selected_policy = policy or policy_for_path(canonical)
    if not selected_policy.require_context:
        raise ProtectedLogError("retag requires a log whose entries carry a project tag")
    if not isinstance(header, str) or not header.strip():
        raise ProtectedLogError("retag header is required")
    project, agent, _session = _metadata(canonical, runtime)
    with _lock(canonical):
        try:
            before = canonical.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as error:
            raise ProtectedLogError(f"cannot read protected log: {error}") from error
        old_entries = validate_document(before, selected_policy, allow_legacy=True)
        old_header = _resolve_target(header.strip(), old_entries)
        entry = next(item for item in old_entries if item.header == old_header)
        if not entry.strict:
            raise ProtectedLogError("retag source entry must use strict writer metadata")
        if entry.agent != agent:
            raise ProtectedLogError("agents may retag only their own entries")
        if entry.context == project:
            raise ProtectedLogError("entry already carries that project tag")
        old_display = _trace_display(old_header)
        new_display = old_display.replace(f"] [{entry.context}] @", f"] [{project}] @", 1)
        new_header = old_header.replace(old_display, new_display, 1)
        if new_display == old_display or new_header in {item.header for item in old_entries}:
            raise ProtectedLogError("retag could not produce a unique new header")

        def _rewrite_trace(match):
            return match.group(0).replace(old_display, new_display)

        updated = before[:entry.start] + new_header + before[entry.start + len(old_header):]
        updated = TRACE_RE.sub(_rewrite_trace, updated)
        updated = FORWARD_RE.sub(_rewrite_trace, updated)
        new_entries = validate_document(updated, selected_policy, allow_legacy=True)
        expected_headers = [new_header if item.header == old_header else item.header for item in old_entries]
        if [item.header for item in new_entries] != expected_headers:
            raise ProtectedLogError("retag changed entry identities or ordering")
        if updated.replace(new_display, old_display) != before:
            raise ProtectedLogError("retag changed text other than the header and its trace references")
        if _preamble(before, old_entries) != _preamble(updated, new_entries):
            raise ProtectedLogError("protected log preamble changed")
        try:
            _atomic_write(canonical, updated)
        except OSError as error:
            raise ProtectedLogError(f"atomic protected-log retag failed: {error}") from error
    return new_header
