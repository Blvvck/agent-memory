import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, hostname, tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";

export type SessionRecord = Record<string, unknown> & {
  source?: string;
  session_id?: string;
  short_session?: string | null;
  updated_at?: string;
  machine?: string;
};

const sharedRoot = join(homedir(), ".agent-memory", "hooks", "shared");
const pipelineDirectory = join(sharedRoot, "pipeline");
export const STATE_DIR = join(sharedRoot, "state");
const stateDirectory = STATE_DIR;
const legacyClaudeCache = join(tmpdir(), "claude-session-id");
const codexHistoryPath = join(homedir(), ".codex", "history.jsonl");

export function detectMachine(): string {
  const machineName = hostname().toLowerCase();
  return machineName.includes("desktop") || machineName.includes("omen") ? "omen" : "mac";
}

export function isoNow(): string {
  return new Date().toISOString();
}

function eventLogPath(): string {
  mkdirSync(stateDirectory, { recursive: true });
  return join(stateDirectory, `events-${detectMachine()}.jsonl`);
}

function currentSessionPath(): string {
  mkdirSync(stateDirectory, { recursive: true });
  return join(stateDirectory, `current-session-${detectMachine()}.json`);
}

export function appendEvent(record: Record<string, unknown>): void {
  appendFileSync(eventLogPath(), `${JSON.stringify({ ts: isoNow(), machine: detectMachine(), ...record })}\n`, "utf8");
}

export function readStdinBytes(): Buffer {
  try {
    return readFileSync(0);
  } catch {
    return Buffer.alloc(0);
  }
}

export function parseJsonBytes(rawBytes: Buffer): Record<string, unknown> | null {
  if (!rawBytes.length || !rawBytes.toString("utf8").trim()) return null;
  try {
    const value: unknown = JSON.parse(rawBytes.toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function eventKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, "") || "unknown";
}

export function shortSessionLabel(source: string, sessionId?: string | null): string | null {
  if (!sessionId) return null;
  return `${detectMachine()}:${source}:${sessionId.slice(0, 8)}`;
}

function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFile(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, path);
}

function readCurrentSession(): SessionRecord {
  const value = readJsonFile(currentSessionPath());
  return value && typeof value === "object" && !Array.isArray(value) ? value as SessionRecord : {};
}

export function codexEnvSessionId(): string | null {
  return process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID || null;
}

export function resolveCodexSessionId(): string | null {
  return codexEnvSessionId() || latestCodexHistorySessionId();
}

export function latestCodexHistorySessionId(limit = 200): string | null {
  if (!existsSync(codexHistoryPath)) return null;
  try {
    const lines = readFileSync(codexHistoryPath, "utf8").split(/\r?\n/).filter(Boolean).slice(-limit);
    for (const line of lines.reverse()) {
      try {
        const payload = JSON.parse(line) as Record<string, unknown>;
        if (typeof payload.session_id === "string" && payload.session_id) return payload.session_id;
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function readLegacyClaudeSession(): SessionRecord | null {
  const cached = readJsonFile(legacyClaudeCache);
  if (cached && typeof cached === "object" && !Array.isArray(cached)) {
    const value = cached as Record<string, unknown>;
    if (typeof value.session_id === "string" && value.session_id) {
      return {
        source: "claude",
        session_id: value.session_id,
        short_session: typeof value.short_session === "string" ? value.short_session : shortSessionLabel("claude", value.session_id),
        updated_at: typeof value.updated_at === "string" ? value.updated_at : undefined,
        machine: typeof value.machine === "string" ? value.machine : detectMachine(),
      };
    }
  }

  try {
    const raw = readFileSync(legacyClaudeCache, "utf8").trim();
    return raw ? { source: "claude", session_id: undefined, short_session: raw, updated_at: undefined, machine: detectMachine() } : null;
  } catch {
    return null;
  }
}

export function resolveCurrentSession(preferredSource?: string): SessionRecord | null {
  const current = readCurrentSession();
  if (current.source && (current.session_id || current.short_session)) {
    if (!preferredSource || preferredSource === current.source) return current;
  }

  if (!preferredSource || preferredSource === "codex") {
    const sessionId = resolveCodexSessionId();
    if (sessionId) {
      return {
        source: "codex",
        session_id: sessionId,
        short_session: shortSessionLabel("codex", sessionId),
        updated_at: isoNow(),
        machine: detectMachine(),
      };
    }
  }

  if (!preferredSource || preferredSource === "claude") {
    const claudeSession = readLegacyClaudeSession();
    if (claudeSession) return claudeSession;
  }
  return Object.keys(current).length ? current : null;
}

export function updateCurrentSession(
  source: string,
  options: {
    sessionId?: string | null;
    event?: string;
    cwd?: string;
    pid?: number;
    active?: boolean;
    extra?: Record<string, unknown>;
  } = {},
): SessionRecord {
  const current = readCurrentSession();
  const sourceChanged = source !== current.source;
  const payload: SessionRecord = { ...current, machine: detectMachine(), source, updated_at: isoNow() };

  if (sourceChanged) {
    for (const staleKey of ["hook_name", "tool_name", "turn_id", "title", "message", "exit_code"]) delete payload[staleKey];
  }
  if (options.event) payload.last_event = options.event;
  if (options.cwd) payload.cwd = options.cwd;
  if (options.pid !== undefined) payload.pid = options.pid;
  if (options.active !== undefined) payload.active = options.active;

  const sessionId = options.sessionId || (source === "codex" ? resolveCodexSessionId() : null);
  if (sessionId) {
    payload.session_id = sessionId;
    payload.short_session = shortSessionLabel(source, sessionId) ?? undefined;
  } else if (sourceChanged) {
    delete payload.session_id;
    delete payload.short_session;
  }
  for (const [key, value] of Object.entries(options.extra ?? {})) {
    if (value !== null && value !== undefined) payload[key] = value;
  }

  writeJsonFile(currentSessionPath(), payload);
  return payload;
}

export function recordHarnessEvent(options: {
  source: string;
  event: string;
  sessionId?: string | null;
  cwd?: string;
  active?: boolean;
  extra?: Record<string, unknown>;
  details?: Record<string, unknown>;
}): void {
  updateCurrentSession(options.source, {
    sessionId: options.sessionId,
    event: options.event,
    cwd: options.cwd,
    active: options.active,
    extra: options.extra,
  });
  appendEvent({
    source: options.source,
    type: "notify",
    event: options.event,
    session_id: options.sessionId,
    cwd: options.cwd,
    ...options.details,
  });
}

function *iterPipelineScripts(eventName: string): Generator<string> {
  for (const directory of [join(pipelineDirectory, "all.d"), join(pipelineDirectory, `${eventKey(eventName)}.d`)]) {
    let entries: string[];
    try {
      entries = readdirSync(directory).sort();
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const scriptPath = join(directory, name);
      const extension = extname(scriptPath);
      if ([".js", ".cjs", ".mjs", ".sh"].includes(extension)) yield scriptPath;
    }
  }
}

export interface PipelineResult {
  returnCode: number;
  stdout: string;
  stderr: string;
}

export function runPipelineCapture(eventName: string, payload: unknown, source: string, strict: boolean): PipelineResult {
  const raw = Buffer.from(JSON.stringify(payload));
  const payloadRecord = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const requestedCwd = typeof payloadRecord.cwd === "string" ? payloadRecord.cwd : "";
  let cwd: string | undefined;
  try { if (requestedCwd && existsSync(requestedCwd) && statSync(requestedCwd).isDirectory()) cwd = requestedCwd; }
  catch { cwd = undefined; }
  let stdout = "";
  let stderr = "";
  for (const scriptPath of iterPipelineScripts(eventName)) {
    const extension = extname(scriptPath);
    const command = extension === ".sh" ? scriptPath : process.execPath;
    const args = extension === ".sh" ? [] : [scriptPath];
    const result = spawnSync(command, args, {
      input: raw,
      encoding: "buffer",
      cwd,
      env: { ...process.env, AGENT_HOOK_EVENT: eventName, AGENT_HOOK_SOURCE: source },
    });
    if (result.stdout?.length) stdout += result.stdout.toString("utf8");
    if (result.stderr?.length) stderr += result.stderr.toString("utf8");
    const returnCode = result.status ?? (result.error ? 1 : 0);
    if (returnCode !== 0) {
      appendEvent({ source, type: "pipeline_error", event: eventName, script: scriptPath, returncode: returnCode });
      if (strict) return { returnCode, stdout, stderr };
    }
  }
  return { returnCode: 0, stdout, stderr };
}

export function runPipeline(eventName: string, payload: unknown, source: string, strict: boolean): number {
  const result = runPipelineCapture(eventName, payload, source, strict);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.returnCode;
}
