import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";

export interface TraceEntry {
  header: string;
  body: string;
  line: number;
  timestamp: string;
}

export interface PendingTrace {
  path: string;
  header: string;
  line?: number;
}

const stateDirectory = join(homedir(), ".agent-memory", "hooks", "shared", "state", "trace-pending");
const invalidTraceValues = new Set(["todo", "tbd", "pending", "add later", "placeholder"]);
const entryHeaderPattern = /^\s*(?:[-*]\s*)?\[(?<timestamp>\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\](?<rest>.*)$/gm;
const traceLinePattern = /^\s*(?:[-*]\s*)?↪\s*trace:\s*(?<value>.+?)\s*$/gim;

export function validSessionId(sessionId: unknown): boolean {
  const value = String(sessionId ?? "").trim();
  const lower = value.toLowerCase();
  if (!value || lower === "unknown" || lower === "current") return false;
  return !["test-session", "codex-test", "placeholder", "dummy"].some((part) => lower.includes(part));
}

export function sessionVariants(sessionId: unknown): Set<string> {
  const value = String(sessionId ?? "").trim();
  const variants = new Set<string>([value]);
  if (!value) return variants;

  const raw = value.split(":").at(-1) ?? value;
  for (const candidate of new Set([value, raw])) {
    const short = candidate.slice(0, 8);
    variants.add(candidate);
    variants.add(short);
    variants.add(`mac:${short}`);
    variants.add(`omen:${short}`);
    for (const cli of ["claude", "codex", "agy", "antigravity", "opencode"]) {
      variants.add(`${cli}:${short}`);
      variants.add(`mac:${cli}:${short}`);
      variants.add(`omen:${cli}:${short}`);
      variants.add(`${cli}:${candidate}`);
      variants.add(`mac:${cli}:${candidate}`);
      variants.add(`omen:${cli}:${candidate}`);
    }
  }
  variants.delete("");
  return variants;
}

export function extractEntries(text: unknown): TraceEntry[] {
  if (typeof text !== "string") return [];
  entryHeaderPattern.lastIndex = 0;
  const matches = [...text.matchAll(entryHeaderPattern)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;
    const bodyStart = start + match[0].length;
    return {
      header: match[0].trim(),
      body: text.slice(bodyStart, end),
      line: text.slice(0, start).split("\n").length,
      timestamp: match.groups?.timestamp ?? "",
    };
  });
}

export function entryMatchesSession(entry: Pick<TraceEntry, "header">, sessionId: unknown): boolean {
  const header = entry.header ?? "";
  return [...sessionVariants(sessionId)].some((variant) => header.includes(`[session:${variant}]`));
}

export function entryIsSubstantive(entry: Pick<TraceEntry, "body">): boolean {
  const lines = entry.body.split("\n").filter((line) => {
    const value = line.trim();
    return value && !value.startsWith("#") && !value.startsWith("```") && !value.startsWith("↪") && !value.toLowerCase().startsWith("trace:");
  });
  return lines.length >= 2;
}

export function entryHasTrace(entry: Pick<TraceEntry, "body">): boolean {
  traceLinePattern.lastIndex = 0;
  for (const match of entry.body.matchAll(traceLinePattern)) {
    const value = (match.groups?.value ?? "").trim().toLowerCase();
    if (value === "none (new topic)") return true;
    if (!invalidTraceValues.has(value) && value.length >= 4) return true;
  }
  return false;
}

export function missingTraceEntries(text: string, sessionId: unknown): TraceEntry[] {
  return extractEntries(text).filter((entry) =>
    entryMatchesSession(entry, sessionId) && entryIsSubstantive(entry) && !entryHasTrace(entry),
  );
}

function statePath(sessionId: unknown): string {
  const digest = createHash("sha256").update(String(sessionId)).digest("hex").slice(0, 32);
  return join(stateDirectory, `${digest}.json`);
}

export function readPending(sessionId: unknown): PendingTrace[] {
  try {
    const payload: unknown = JSON.parse(readFileSync(statePath(sessionId), "utf8"));
    return Array.isArray(payload) ? payload as PendingTrace[] : [];
  } catch {
    return [];
  }
}

function writePending(sessionId: unknown, entries: PendingTrace[]): void {
  mkdirSync(stateDirectory, { recursive: true });
  const path = statePath(sessionId);
  const temporaryPath = join(stateDirectory, `.${basename(path, ".json")}-${process.pid}-${randomUUID()}.tmp`);
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

export function addPending(sessionId: unknown, path: string, entries: TraceEntry[]): PendingTrace[] {
  const pending = readPending(sessionId);
  const existing = new Set(pending.map((item) => `${item.path}\0${item.header}`));
  const added: PendingTrace[] = [];
  for (const entry of entries) {
    const key = `${path}\0${entry.header}`;
    if (existing.has(key)) continue;
    const item = { path, header: entry.header, line: entry.line };
    pending.push(item);
    existing.add(key);
    added.push(item);
  }
  if (added.length) writePending(sessionId, pending);
  return added;
}

export function resolvePending(sessionId: unknown): PendingTrace[] {
  const pending = readPending(sessionId);
  const unresolved: PendingTrace[] = [];
  for (const item of pending) {
    let text: string;
    try {
      text = readFileSync(item.path, "utf8");
    } catch {
      continue;
    }
    const entry = extractEntries(text).find((candidate) => candidate.header === item.header);
    if (entry && entryIsSubstantive(entry) && !entryHasTrace(entry)) {
      unresolved.push({ ...item, line: entry.line });
    }
  }

  if (unresolved.length) writePending(sessionId, unresolved);
  else rmSync(statePath(sessionId), { force: true });
  return unresolved;
}
