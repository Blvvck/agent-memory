"""Fail-closed detection for direct mutations of agent protected logs."""

import os
import re
import shlex
import shutil
from pathlib import Path

from protected_log import ProtectedLogError, canonical_protected_log_path


SHARED_DIR = Path(__file__).resolve().parent
WRITER_NAME = "agent-log.py"
HUMAN_WRITER_NAME = "agent-log"
PROTECTED_NAMES = {"MEMORY.MD", "LEARNINGS.MD", "PATTERNS.MD", "ACTIVITY.MD", "NOTIFICATIONS.MD"}
PATCH_FILE_RE = re.compile(r"^\*\*\* (?:Update|Add|Delete) File: (.+?)\s*$", re.MULTILINE)
PYTHON_COMMAND = re.compile(r"^python(?:3)?(?:\s|$)")
PYTHON_OPEN_READ = re.compile(r"open\s*\([^\n]*\)\s*\.\s*read(?:line|lines)?\s*\(")
PYTHON_OPEN_WRITE = re.compile(r"open\s*\([^\n]*[, ]['\"](?:w|a|x|r\+)['\"]")
PYTHON_READ_MARKERS = ("read_text(", "read_bytes(", "validate_document(", "protected_log.py")
PYTHON_WRITE_MARKERS = (
    "write_text(", "write_bytes(", ".write(", "writelines(", "truncate(", "os.remove(",
    "os.unlink(", "unlink(", "replace(", "shutil.", "rm -", "tee ", ">>",
    "os.system", "subprocess", "popen(", "exec(", "eval(", "__import__", "rename(", "rmdir(",
)


def writer_guidance(target="<protected-log>"):
    return (
        "Next steps: read the target first, use trace-search to find one older entry, then pass either "
        "its exact older entry header or a stable [timestamp] @Agent [session:cli:id] reference, "
        "then write through the protected writer. Use `--trace 'none (new topic)'` only when no "
        "related older entry exists; do not invent timestamps or edit historical lines. Command shape: "
        f"{SHARED_DIR / HUMAN_WRITER_NAME} --file {target} --content-file <entry-content-file> "
        "--trace '<exact older header or stable reference>' --agent <active-agent> --cli <runtime> "
        "--session-id <real-session-id> [--project <project>]"
    )


def _candidate_path(raw_path, cwd):
    if not isinstance(raw_path, str) or not raw_path.strip():
        return None
    path = Path(raw_path.strip()).expanduser()
    if not path.is_absolute():
        path = Path(cwd or os.getcwd()) / path
    try:
        return path.resolve()
    except OSError:
        return path.absolute()


def is_protected_path(path):
    candidate = _candidate_path(str(path), os.getcwd()) if not isinstance(path, Path) else path
    if candidate is None or candidate.name.upper() not in PROTECTED_NAMES:
        return False
    return ".agent-memory" in candidate.parts


def _tool_paths(payload):
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return []
    cwd = tool_input.get("workdir") or tool_input.get("cwd") or payload.get("cwd") or os.getcwd()
    paths = []
    for key in ("file_path", "path", "filename", "filePath"):
        value = tool_input.get(key)
        if value:
            candidate = _candidate_path(value, cwd)
            if candidate and candidate not in paths:
                paths.append(candidate)
    return paths


def _patch_paths(payload):
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return []
    patch = tool_input.get("command") or tool_input.get("patch") or tool_input.get("input") or ""
    if not isinstance(patch, str):
        return []
    cwd = tool_input.get("workdir") or tool_input.get("cwd") or payload.get("cwd") or os.getcwd()
    return [path for path in (_candidate_path(raw, cwd) for raw in PATCH_FILE_RE.findall(patch)) if path]


def _bash_command(payload):
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return ""
    for key in ("command", "cmd", "script"):
        if isinstance(tool_input.get(key), str):
            return tool_input[key]
    return ""


NEUTRAL_COMMANDS = {"cd", "pwd", "true", "false", "echo", "printf", "test", "["}
FIND_WRITE_FLAGS = {"-delete", "-exec", "-execdir", "-ok", "-okdir", "-fprint", "-fprint0", "-fprintf", "-fls"}
SAFE_REDIRECT = re.compile(r"^(?:\d*>&\d+|\d*>/dev/null|&>/dev/null)$")
SED_LONG_OPTIONS = {
    "quiet": "quiet", "silent": "quiet", "expression": "script", "line-length": "value",
    "file": "blocked", "in-place": "blocked",
    **dict.fromkeys(
        ["debug", "posix", "sandbox", "follow-symlinks", "null-data", "zero-terminated",
         "separate", "unbuffered", "regexp-extended", "help", "version"],
        "harmless",
    ),
}
SED_HARMLESS_FLAGS = "Ersuza"
SED_SAFE_SCRIPT_CHARS = set("pP=lqQnNdDgGhHxzFv{}!;,$~+ \t\n0123456789")
UNIQ_VALUE_OPTIONS = {"-f", "-s", "-w", "--skip-fields", "--skip-chars", "--check-chars"}
HEREDOC_START =re.compile(r"<<(-?)[ \t]*(?:'([^'\n]*)'|\"([^\"\n]*)\"|([^\s;&|<>()'\"]+))")


def _split_segments(command):
    """Quote-aware split on ; && || | & and newlines; None when the shape cannot be judged."""
    segments, current, quote, index, heredocs = [], [], None, 0, []
    while index < len(command):
        char = command[index]
        here_string = command.startswith("<<<", index) or (index and command[index - 1] == "<")
        heredoc = None if quote or here_string else HEREDOC_START.match(command, index)
        if heredoc:
            current.append(heredoc.group(0))
            heredocs.append(heredoc)
            index = heredoc.end()
            continue
        if quote:
            current.append(char)
            if char == "\\" and quote == '"' and index + 1 < len(command):
                index += 1
                current.append(command[index])
            elif char == quote:
                quote = None
        elif char in "'\"":
            quote = char
            current.append(char)
        elif char == "\\" and index + 1 < len(command):
            current.append(char + command[index + 1])
            index += 1
        elif char == "`" or command.startswith(("$(", "<(", ">("), index):
            return None
        elif char in ";|\n" or (char == "&" and not _is_redirect_amp(command, index)):
            segments.append("".join(current))
            current = []
            if char == "\n" and heredocs:
                index = _skip_heredoc_bodies(command, index + 1, heredocs)
                if index is None:
                    return None
                heredocs = []
                continue
        else:
            current.append(char)
        index += 1
    if quote or heredocs:
        return None
    segments.append("".join(current))
    return [segment.strip() for segment in segments if segment.strip()]


def _skip_heredoc_bodies(command, index, heredocs):
    """Heredoc bodies are data, not commands, but unquoted bodies still expand, so substitutions fail closed."""
    lines = command[index:].split("\n")
    consumed = 0
    for heredoc in heredocs:
        strip_tabs = heredoc.group(1)
        delimiter = next(group for group in heredoc.groups()[1:] if group is not None)
        expands = heredoc.group(4) is not None
        while True:
            if consumed >= len(lines):
                return None
            line = lines[consumed]
            consumed += 1
            if (line.lstrip("\t") if strip_tabs else line) == delimiter:
                break
            if expands and ("$(" in line or "`" in line):
                return None
    return index + sum(len(line) + 1 for line in lines[:consumed])


def _is_redirect_amp(command, index):
    before = command[index - 1] if index else ""
    after = command[index + 1] if index + 1 < len(command) else ""
    return before in "<>" or after == ">"


def _segment_words(segment):
    try:
        lexer = shlex.shlex(segment, posix=True, punctuation_chars="<>&")
        lexer.whitespace_split = True
        return list(lexer)
    except ValueError:
        return None


def _redirect_target_is_protected(target):
    if not target or any(char in target for char in "$*?[{"):
        return True
    path = Path(target).expanduser()
    if path.name.upper() in PROTECTED_NAMES:
        return True
    try:
        return path.resolve().name.upper() in PROTECTED_NAMES
    except OSError:
        return True


def _redirects_to_protected(words):
    for position, word in enumerate(words):
        if not set(word) <= set("<>&0123456789") or not set(word) & set("<>&"):
            continue
        if "<" in word and ">" not in word:
            continue
        target = words[position + 1] if position + 1 < len(words) else ""
        if word.endswith("&") or re.search(r">&\d+$", word):
            continue
        if SAFE_REDIRECT.match(word + target) or SAFE_REDIRECT.match(word):
            continue
        if _redirect_target_is_protected(target):
            return True
    return False


def _is_installed_writer(program):
    """Only a path that resolves to the shared writer counts, because the name alone proves nothing.

    Relative paths fail closed: their target depends on the command's own `cd`, which the guard
    cannot see, so `cd /tmp/evil && ./agent-log` must not look like the installed writer.
    """
    name = os.path.basename(program)
    if name not in {HUMAN_WRITER_NAME, WRITER_NAME}:
        return False
    expanded = os.path.expanduser(program)
    if "/" in program:
        if not os.path.isabs(expanded):
            return False
        located = expanded
    else:
        located = shutil.which(program)
    if not located:
        return False
    try:
        return Path(located).resolve() == (SHARED_DIR / name).resolve()
    except OSError:
        return False


def _is_installed_codex_spawner(program):
    if os.path.basename(program) != "codex-spawn.sh":
        return False
    located = program if "/" in program else shutil.which(program)
    if not located:
        return False
    try:
        return Path(located).expanduser().resolve() == (Path.home() / ".agent-memory/tools/codex-spawn.sh").resolve()
    except OSError:
        return False


def _is_writer_call(program, args):
    if _is_installed_writer(program):
        return True
    return bool(PYTHON_COMMAND.match(os.path.basename(program))) and bool(args) and _is_installed_writer(args[0])


def _uniq_operands(args):
    """uniq writes its second operand, so option values must not be mistaken for files."""
    operands, index = [], 0
    while index < len(args):
        arg = args[index]
        if arg == "--":
            operands.extend(args[index + 1:])
            break
        if arg in UNIQ_VALUE_OPTIONS:
            index += 2
            continue
        if not arg.startswith("-") or arg == "-":
            operands.append(arg)
        index += 1
    return operands


def _segment_is_read_only(segment):
    words = _segment_words(segment)
    if not words or _redirects_to_protected(words):
        return False
    while words and re.match(r"^[A-Za-z_]\w*=", words[0]):
        words = words[1:]
    if not words:
        return True
    name = os.path.basename(words[0])
    args = words[1:]
    if name in NEUTRAL_COMMANDS or _is_writer_call(words[0], args):
        return True
    if _is_installed_codex_spawner(words[0]):
        return "$((" not in segment and "$(" not in segment and "`" not in segment
    if name == "git" and args and args[0] == "check-ignore":
        return True
    if name == "sed":
        return _sed_is_read_only(args)
    if name == "find":
        return not any(arg in FIND_WRITE_FLAGS for arg in args)
    if name == "sort":
        return not any(_sort_option_writes(arg) for arg in args)
    if name == "uniq":
        return len(_uniq_operands(args)) <= 1
    if name == "rg":
        return not any(arg == "--pre" or arg.startswith("--pre=") for arg in args)
    return name in {"cat", "head", "tail", "grep", "wc", "stat", "file", "ls", "cut", "tr", "trace-search"}


def _sort_option_writes(arg):
    if re.match(r"^-[a-zA-Z]*o", arg):
        return True
    option = arg[2:].split("=")[0] if arg.startswith("--") else ""
    return bool(option) and ("output".startswith(option) or "compress-program".startswith(option))


def _sed_is_read_only(args):
    """Parse sed options the way GNU and BSD sed do; anything unrecognized fails closed."""
    quiet, scripts, index = False, [], 0
    while index < len(args):
        arg = args[index]
        if arg == "--":
            if not scripts and index + 1 < len(args):
                scripts.append(args[index + 1])
            break
        if arg.startswith("--"):
            option, has_value, value = arg[2:].partition("=")
            matches = [name for name in SED_LONG_OPTIONS if name.startswith(option)] if option else []
            resolved = option if option in SED_LONG_OPTIONS else (matches[0] if len(matches) == 1 else None)
            kind = SED_LONG_OPTIONS.get(resolved)
            if kind is None or kind == "blocked":
                return False
            if kind == "quiet":
                quiet = True
            if kind in {"script", "value"} and not has_value:
                index += 1
                if index >= len(args):
                    return False
                value = args[index]
            if kind == "script":
                scripts.append(value)
        elif arg.startswith("-") and arg != "-":
            position = 1
            while position < len(arg):
                flag = arg[position]
                if flag == "n":
                    quiet = True
                elif flag == "e":
                    value = arg[position + 1:]
                    if not value:
                        index += 1
                        if index >= len(args):
                            return False
                        value = args[index]
                    scripts.append(value)
                    break
                elif flag not in SED_HARMLESS_FLAGS:
                    return False
                position += 1
        elif not scripts:
            scripts.append(arg)
        index += 1
    return quiet and bool(scripts) and all(_sed_script_is_read_only(script) for script in scripts)


def _skip_sed_delimited(script, index, delimiter):
    """Return the index just past the closing delimiter, honoring escapes and bracket expressions."""
    while index < len(script):
        char = script[index]
        if char == "\\":
            index += 2
            continue
        if char == "[":
            close = index + 1
            if close < len(script) and script[close] == "^":
                close += 1
            if close < len(script) and script[close] == "]":
                close += 1
            close = script.find("]", close)
            if close == -1:
                return None
            index = close + 1
            continue
        if char == delimiter:
            return index + 1
        index += 1
    return None


def _sed_script_is_read_only(script):
    """Allow only commands that print or move text; w, W, e, the s///w and s///e flags, and unknowns fail closed."""
    index = 0
    while index < len(script):
        char = script[index]
        if char in "/\\":
            delimiter = "/" if char == "/" else (script[index + 1] if index + 1 < len(script) else "")
            index = _skip_sed_delimited(script, index + (1 if char == "/" else 2), delimiter) if delimiter else None
            if index is None:
                return False
            while index < len(script) and script[index] in "IM":
                index += 1
        elif char in "sy":
            if index + 1 >= len(script) or script[index + 1] in "\\\n":
                return False
            delimiter = script[index + 1]
            index = _skip_sed_delimited(script, index + 2, delimiter)
            index = _skip_sed_delimited(script, index, delimiter) if index is not None else None
            if index is None:
                return False
            if char == "s":
                while index < len(script) and (script[index].isalnum()):
                    if script[index] in "weW":
                        return False
                    index += 1
        elif char == "#":
            newline = script.find("\n", index)
            index = newline if newline != -1 else len(script)
        elif char in ":btT":
            index += 1
            while index < len(script) and script[index] in " \t":
                index += 1
            while index < len(script) and script[index] not in " \t\n;":
                index += 1
        elif char in SED_SAFE_SCRIPT_CHARS:
            index += 1
        else:
            return False
    return True


def _compound_is_read_only(command):
    segments = _split_segments(command)
    if not segments:
        return False
    return all(_segment_is_read_only(segment) for segment in segments)


def _bash_mutates(command):
    if not command.strip():
        return False
    if _compound_is_read_only(command):
        return False
    lowered = command.lower()
    if PYTHON_COMMAND.match(command.strip()):
        if PYTHON_OPEN_WRITE.search(lowered):
            return True
        if any(marker in lowered for marker in PYTHON_WRITE_MARKERS):
            return True
        if any(marker in lowered for marker in PYTHON_READ_MARKERS) or PYTHON_OPEN_READ.search(lowered):
            return False
    return True


def guard_payload(payload):
    """Return a block reason, or None when the proposed operation is allowed."""
    if not isinstance(payload, dict) or payload.get("hook_event_name") != "PreToolUse":
        return None
    tool_name = str(payload.get("tool_name") or "")
    if tool_name == "Bash":
        command = _bash_command(payload)
        if any(name.lower() in command.lower() for name in PROTECTED_NAMES) and _bash_mutates(command):
            return (
                "Direct shell mutation of a agent protected log is blocked. "
                f"Use {SHARED_DIR / HUMAN_WRITER_NAME} for protected logging; it enforces metadata, ordering, traces, locking, and atomicity. "
                + writer_guidance()
            )
        return None

    if tool_name not in {"Edit", "Write", "apply_patch"}:
        return None
    paths = _patch_paths(payload) if tool_name == "apply_patch" else _tool_paths(payload)
    protected = [path for path in paths if is_protected_path(path)]
    if not protected:
        return None
    for path in protected:
        try:
            canonical_protected_log_path(path)
        except ProtectedLogError as error:
            return f"agent log routing is blocked: {error} Use the protected writer with the canonical project .agent-memory path."
    return (
        "Direct mutation of a agent protected log is blocked: "
        + ", ".join(str(path) for path in protected)
        + f". Use {SHARED_DIR / HUMAN_WRITER_NAME} for user-visible logging or {SHARED_DIR / WRITER_NAME} for machine-readable JSON; these are the only approved writers. "
        + writer_guidance(str(protected[0]))
    )
