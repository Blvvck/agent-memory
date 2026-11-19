import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";
import { canonicalProtectedLogPath, ProtectedLogError } from "./protected-log";

const protectedNames = new Set(["MEMORY.MD", "LEARNINGS.MD", "PATTERNS.MD", "ACTIVITY.MD", "NOTIFICATIONS.MD"]);
const patchPath = /^\*\*\* (?:Update|Add|Delete) File: (.+?)\s*$/gm;
const readOnlyCommands = new Set(["cat", "head", "tail", "grep", "rg", "wc", "stat", "file", "ls", "cut", "tr", "trace-search", "pwd", "true", "false", "echo", "printf", "test", "["]);
const neutralCommands = new Set(["cd"]);
const readOnlyGitCommands = new Set(["blame", "branch", "cat-file", "check-ignore", "describe", "diff", "grep", "log", "ls-files", "remote", "rev-parse", "show", "status", "tag"]);

function candidatePath(value: unknown, cwd: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim().replace(/^~/, process.env.HOME ?? "");
  return resolve(isAbsolute(raw) ? raw : resolve(cwd, raw));
}

function protectedPath(path: string): boolean {
  if (!protectedNames.has(basename(path).toUpperCase())) return false;
  return path.split(/[\\/]/).some((part) => [".agent-memory", ".claude", ".codex", ".opencode", ".agents", ".cursor"].includes(part));
}

function pathsFromPayload(payload: Record<string, unknown>, toolName: string): string[] {
  const input = payload.tool_input && typeof payload.tool_input === "object" ? payload.tool_input as Record<string, unknown> : {};
  const cwd = String(input.workdir || input.cwd || payload.cwd || process.cwd());
  const found: string[] = [];
  if (toolName === "apply_patch") {
    const patch = [input.command, input.patch, input.input].find((value) => typeof value === "string");
    if (typeof patch === "string") {
      patchPath.lastIndex = 0;
      for (const match of patch.matchAll(patchPath)) {
        const path = candidatePath(match[1], cwd);
        if (path) found.push(path);
      }
    }
  } else {
    for (const key of ["file_path", "path", "filename", "filePath"]) {
      const path = candidatePath(input[key], cwd);
      if (path) found.push(path);
    }
  }
  return [...new Set(found)];
}

function splitShell(command: string): string[] | null {
  const segments: string[] = [];
  let current = "";
  let quote = "";
  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    if (quote) {
      current += char;
      if (char === "\\" && quote === '"' && index + 1 < command.length) current += command[++index];
      else if (char === quote) quote = "";
    } else if (char === "'" || char === '"') {
      quote = char;
      current += char;
    } else if (char === "\\" && index + 1 < command.length) current += char + command[++index];
    else if (char === "`" || command.startsWith("$(", index) || command.startsWith("<(", index) || command.startsWith(">(", index)) return null;
    else if (char === ";" || char === "|" || char === "\n" || (char === "&" && command[index + 1] !== ">" && command[index - 1] !== "<" && command[index - 1] !== ">")) {
      if (current.trim()) segments.push(current.trim());
      current = "";
      if ((char === "|" || char === "&") && command[index + 1] === char) index++;
    } else current += char;
  }
  if (quote) return null;
  if (current.trim()) segments.push(current.trim());
  return segments;
}

function words(segment: string): string[] | null {
  const result: string[] = [];
  let value = "";
  let quote = "";
  for (let index = 0; index < segment.length; index++) {
    const char = segment[index];
    if (quote) {
      if (char === quote) quote = "";
      else if (char === "\\" && quote === '"' && index + 1 < segment.length) value += segment[++index];
      else value += char;
    } else if (char === "'" || char === '"') quote = char;
    else if (/\s/.test(char)) {
      if (value) result.push(value);
      value = "";
    } else if (char === "\\" && index + 1 < segment.length) value += segment[++index];
    else value += char;
  }
  if (quote) return null;
  if (value) result.push(value);
  return result;
}

function resolveProgram(program: string): string | null {
  if (isAbsolute(program)) return existsSync(program) ? program : null;
  if (program.includes("/")) {
    const local = resolve(program);
    return existsSync(local) ? local : null;
  }
  return process.env.PATH?.split(":").map((dir) => resolve(dir, program)).find(existsSync) ?? null;
}

function installedWriter(program: string, cwd = process.cwd()): boolean {
  const name = basename(program);
  if (name !== "agent-log" && name !== "agent-log.js") return false;
  const candidate = isAbsolute(program) ? program
    : program.includes("/") ? resolve(cwd, program)
    : resolveProgram(program);
  if (!candidate || !existsSync(candidate)) return false;
  try {
    const actual = realpathSync(candidate);
    if (actual === realpathSync(resolve(__dirname, "agent-log.js"))) return true;
    return actual.endsWith("@blvvck/agent-memory/dist/agent-log.js");
  } catch { return false; }
}

function segmentReadOnly(segment: string): boolean {
  if (/(?:^|\s)(?:>>?|<>|&>?)\s*[^\s]*/.test(segment)) {
    const redirects = [...segment.matchAll(/(?:^|\s)(\d*[<>]{1,2}|&>|>\&)\s*([^\s]*)/g)];
    if (redirects.some((match) => !/^\d*>&\d+$/.test(match[1] + match[2]) && !/^\d*>\/dev\/null$/.test(match[1] + match[2]))) return false;
  }
  const parsed = words(segment);
  if (!parsed?.length) return false;
  let args = parsed;
  while (args.length && /^[A-Za-z_]\w*=/.test(args[0])) args = args.slice(1);
  if (!args.length) return true;
  const program = basename(args[0]);
  if (neutralCommands.has(program) || installedWriter(args[0])) return true;
  if (["node", "nodejs"].includes(program) && args.length > 1 && installedWriter(args[1])) return true;
  if (program === "git" && args.length > 1) {
    const subcommand = args[1];
    if (subcommand === "add") return true;
    if (readOnlyGitCommands.has(subcommand)) {
      return !args.slice(2).some((arg) => arg === "--output" || arg === "--ext-diff" || arg === "--textconv" || arg.startsWith("--output=") || (arg.startsWith("-o") && arg.length > 2));
    }
  }
  if (program === "find") return !args.some((arg) => ["-delete", "-exec", "-execdir", "-ok", "-okdir", "-fprint", "-fprint0", "-fprintf", "-fls"].includes(arg));
  if (program === "sort") return !args.some((arg) => /^-[a-zA-Z]*o/.test(arg) || arg.startsWith("--output") || arg.startsWith("--compress-program"));
  if (program === "uniq") return args.filter((arg, index) => !arg.startsWith("-") || arg === "-").length <= 1;
  if (program === "rg") return !args.some((arg) => arg === "--pre" || arg.startsWith("--pre="));
  if (program === "sed") {
    const script = args.find((arg) => !arg.startsWith("-"));
    return args.some((arg) => arg === "-n" || arg === "--quiet" || arg === "--silent") && Boolean(script) && !/[ewW]/.test(script!.replace(/s([^\s]).*?\1/g, ""));
  }
  return readOnlyCommands.has(program);
}

function isWriterCommand(command: string, cwd: string): boolean {
  const segments = splitShell(command);
  if (!segments?.length) return false;
  return segments.every((segment) => {
    if (/(?:^|\s)(?:\d*[<>]{1,2}|&>)\s*[^\s&]/.test(segment)) return false;
    const parsed = words(segment);
    if (!parsed?.length) return false;
    const args = parsed.filter((arg, index) => index > 0 || !/^[A-Za-z_][A-Za-z0-9_]*=/.test(arg));
    while (args.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0])) args.shift();
    if (!args.length) return false;
    const program = basename(args[0]);
    if (installedWriter(args[0], cwd)) return true;
    return ["node", "nodejs"].includes(program) && args.length > 1 && installedWriter(args[1], cwd);
  });
}

function shellMutates(command: string): boolean {
  const segments = splitShell(command);
  return !segments || !segments.length || segments.some((segment) => !segmentReadOnly(segment));
}

export function guardPayload(payload: Record<string, unknown>): string | null {
  if (payload.hook_event_name !== "PreToolUse") return null;
  const toolName = String(payload.tool_name || "");
  if (toolName === "Bash") {
    const input = payload.tool_input && typeof payload.tool_input === "object" ? payload.tool_input as Record<string, unknown> : {};
    const command = String(input.command || input.cmd || input.script || "");
    const cwd = String(input.workdir || input.cwd || payload.cwd || process.cwd());
    if (isWriterCommand(command, cwd)) return null;
    if ([...protectedNames].some((name) => command.toUpperCase().includes(name)) && shellMutates(command)) {
      return `Direct shell mutation of protected agent memory is blocked. Use the installed agent-log writer for protected logging. ${command}`;
    }
    return null;
  }
  if (!["Edit", "Write", "apply_patch"].includes(toolName)) return null;
  const protectedFiles = pathsFromPayload(payload, toolName).filter(protectedPath);
  if (!protectedFiles.length) return null;
  for (const path of protectedFiles) {
    try { canonicalProtectedLogPath(path); }
    catch (error) {
      if (error instanceof ProtectedLogError) return `Protected log routing is blocked: ${error.message}`;
      return `Protected log routing is blocked: ${String(error)}`;
    }
  }
  return `Direct mutation of protected agent logs is blocked: ${protectedFiles.join(", ")}. Use the installed agent-log writer.`;
}

if (require.main === module) {
  let reason: string | null = null;
  try {
    const payload = JSON.parse(readFileSync(0, "utf8")) as Record<string, unknown>;
    reason = guardPayload(payload);
  } catch {
    reason = "The protected-log guard could not read its input, so this tool call is blocked. Retry the call, and if it repeats, use the installed agent-log writer.";
  }
  if (reason) process.stdout.write(`${JSON.stringify({ decision: "block", reason })}\n`);
}
