import { closeSync, existsSync, fsyncSync, openSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { projectMemoryRoot } from "./memory-paths";

export class ProtectedLogError extends Error {
  constructor(message: string, readonly nextSteps?: string) {
    super(message);
    this.name = "ProtectedLogError";
  }
}

export interface LogPolicy {
  name: string;
  requireContext: boolean;
  ordering: "newest" | null;
}

interface Entry {
  header: string;
  timestamp: string;
  start: number;
  bodyStart: number;
  end: number;
  body: string;
  context?: string;
  agent: string;
  session: string;
  strict: boolean;
}

const protectedNames = new Set(["MEMORY.MD", "LEARNINGS.MD", "PATTERNS.MD", "ACTIVITY.MD", "NOTIFICATIONS.MD", "HISTORY.MD"]);
const projectMemoryDirectories = [".agent-memory", ".claude", ".codex", ".opencode", ".agents", ".cursor"];
const invalidSessionParts = ["unknown", "current", "placeholder", "dummy", "test", "fake"];
const invalidTraceValues = new Set(["todo", "tbd", "pending", "add later", "placeholder"]);
const cliPattern = "claude|codex|agy|antigravity|opencode|cursor";
const headerPattern = new RegExp(`^([-*]\\s+)?\\[(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z)\\](?: \\[([A-Za-z0-9][A-Za-z0-9._-]*)\\])? @([A-Za-z][A-Za-z0-9_-]*) \\[session:((${cliPattern}):([A-Za-z0-9][A-Za-z0-9._-]*))\\]: (\\S.*)$`, "gm");
const legacyHeaderPattern = /^([-*]\s+)?\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\]((?:\s+\[[^\]]+\])*)\s+@([A-Za-z][A-Za-z0-9_-]*)\s+\[session:([^\]]+)\](?:\s+\[[^\]]+\])?:\s+(\S.*)$/gm;
const tracePattern = /^\s*(?:[-*]\s*)?↪\s*trace:\s*(.+?)\s*$/gm;
const forwardPattern = /^\s*(?:[-*]\s*)?↪\s*trace-forward:\s*(.+?)\s*$/gm;
const dateLinePattern = /^\s*(?:[-*]\s*)?\[\d{4}-\d{2}-\d{2}/;

function matches(pattern: RegExp, text: string): RegExpExecArray[] {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)] as RegExpExecArray[];
}

function validSession(session: string): boolean {
  const colon = session.indexOf(":");
  if (colon < 0 || !["claude", "codex", "agy", "antigravity", "opencode", "cursor"].includes(session.slice(0, colon))) return false;
  const id = session.slice(colon + 1).toLowerCase();
  return Boolean(id) && !invalidSessionParts.some((part) => id.includes(part));
}

export function policyForPath(path: string): LogPolicy {
  const canonical = resolve(path);
  const name = basename(canonical).toUpperCase();
  if (name === "PATTERNS.MD") return { name: "patterns", requireContext: true, ordering: "newest" };
  if (name === "ACTIVITY.MD") return { name: "activity", requireContext: true, ordering: "newest" };
  if (name === "NOTIFICATIONS.MD") return { name: "notifications", requireContext: true, ordering: "newest" };
  if (name === "HISTORY.MD") return { name: "history", requireContext: true, ordering: "newest" };
  if (name === "MEMORY.MD" || name === "LEARNINGS.MD") return { name: name.toLowerCase().slice(0, -3), requireContext: true, ordering: "newest" };
  throw new ProtectedLogError(`unrecognized protected log: ${path}`);
}

function gitMainRoot(path: string): string | null {
  let cursor = existsSync(path) && statSync(path).isDirectory() ? path : dirname(path);
  while (true) {
    const marker = join(cursor, ".git");
    if (existsSync(marker) && statSync(marker).isDirectory()) return resolve(cursor);
    if (existsSync(marker) && statSync(marker).isFile()) {
      const content = readFileSync(marker, "utf8").trim();
      if (!content.startsWith("gitdir:")) return null;
      const gitdir = resolve(cursor, content.slice("gitdir:".length).trim());
      let root = gitdir;
      for (let index = 0; index < 3; index++) root = dirname(root);
      return root;
    }
    const parent = dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}

export function canonicalProtectedLogPath(path: string): string {
  const expanded = path.startsWith("~") ? join(homedir(), path.slice(1).replace(/^[/\\]/, "")) : path;
  const raw = resolve(expanded);
  const canonical = existsSync(raw) ? realpathSync(raw) : raw;
  if (!protectedNames.has(basename(canonical).toUpperCase())) return canonical;
  const name = basename(canonical).toUpperCase();
  let cursor = raw;
  let memoryDir: string | null = null;
  while (true) {
    if (projectMemoryDirectories.includes(basename(cursor))) { memoryDir = cursor; break; }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  if (memoryDir) {
    const selectedMemoryDir = projectMemoryRoot(dirname(memoryDir));
    if (resolve(selectedMemoryDir) !== resolve(memoryDir)) {
      throw new ProtectedLogError(`protected log must use the project's one selected memory directory (${selectedMemoryDir}); ${memoryDir} is not selected. Update .agent-memory-layout only when intentionally changing the project's memory location.`);
    }
  }
  const root = gitMainRoot(raw);
  if (name === "ACTIVITY.MD") {
    const globalPath = resolve(homedir(), ".agent-memory", "ACTIVITY.md");
    const projectPaths = root ? projectMemoryDirectories.map((directory) => resolve(root, directory, "ACTIVITY.md")) : [];
    const isCanonicalProjectAlias = canonical !== raw && projectPaths.includes(canonical) && projectMemoryDirectories.some((directory) => raw.replace(/\\/g, "/").endsWith(`/${directory}/ACTIVITY.md`));
    const isManifestProjectPath = !root && memoryDir && raw === resolve(memoryDir, "ACTIVITY.md");
    if (raw !== globalPath && !projectPaths.includes(raw) && !isCanonicalProjectAlias && !isManifestProjectPath) {
      throw new ProtectedLogError(`activity logs must be ~/.agent-memory/ACTIVITY.md or ACTIVITY.md under a supported project memory directory: ${path}`);
    }
  }
  if (name === "NOTIFICATIONS.MD") {
    const globalPath = resolve(homedir(), ".agent-memory", "NOTIFICATIONS.md");
    if (raw !== globalPath) throw new ProtectedLogError(`notifications must be ~/.agent-memory/NOTIFICATIONS.md: ${path}`);
  }
  if (name === "HISTORY.MD") {
    const globalPath = resolve(homedir(), ".agent-memory", "human", "history.md");
    const projectPaths = root ? projectMemoryDirectories.map((directory) => resolve(root, directory, "human", "history.md")) : [];
    const isManifestProjectPath = !root && memoryDir && raw === resolve(memoryDir, "human", "history.md");
    if (raw !== globalPath && !projectPaths.includes(raw) && !isManifestProjectPath) {
      throw new ProtectedLogError(`human history must be ~/.agent-memory/human/history.md or history.md under a project human directory: ${path}`);
    }
  }
  if (memoryDir && root) {
    const actual = existsSync(memoryDir) ? realpathSync(memoryDir) : resolve(memoryDir);
    const expected = projectMemoryDirectories.map((directory) => {
      const candidate = resolve(root, directory);
      try { return existsSync(candidate) ? realpathSync(candidate) : candidate; }
      catch { return candidate; }
    });
    if (!expected.includes(actual)) throw new ProtectedLogError(`protected log must use the canonical project memory directory (${expected.join(" or ")}); worktree-local project memory is not allowed (${memoryDir}). Use the main checkout path or symlink the memory directory to it.`);
  }
  return canonical;
}

function entries(text: string, policy: LogPolicy, allowLegacy = false): Entry[] {
  const strict = matches(headerPattern, text).flatMap((match) => {
    const context = match[3] || undefined;
    if (policy.requireContext !== Boolean(context) || !validSession(match[5])) return [];
    return [{ match, strict: true as const, context }];
  });
  if (!allowLegacy) {
    for (const line of text.split(/\r?\n/)) {
      if (dateLinePattern.test(line) && !line.includes("↪") && !headerPattern.test(line)) throw new ProtectedLogError("malformed timestamped entry metadata");
      headerPattern.lastIndex = 0;
    }
  }
  const parsed: Array<{ match: RegExpExecArray; strict: boolean; context?: string }> = [...strict];
  if (allowLegacy) {
    const spans = new Set(strict.map(({ match }) => `${match.index}:${match[0].length}`));
    for (const match of matches(legacyHeaderPattern, text)) {
      if (!spans.has(`${match.index}:${match[0].length}`)) {
        const tag = /\[([^\]]+)\]/.exec(match[3])?.[1];
        parsed.push({ match, strict: false, context: tag });
      }
    }
    parsed.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
  }
  return parsed.map(({ match, strict: isStrict, context }, index) => {
    const start = match.index ?? 0;
    const rawHeader = match[0];
    const header = rawHeader.replace(/\r$/, "");
    const afterHeader = start + rawHeader.length;
    const bodyStart = afterHeader + (text[afterHeader] === "\n" ? 1 : 0);
    const nextEntry = index + 1 < parsed.length ? parsed[index + 1].match.index ?? text.length : text.length;
    const nextHeading = /^##\s+/m.exec(text.slice(bodyStart));
    const headingBoundary = nextHeading ? bodyStart + nextHeading.index : text.length;
    const end = Math.min(nextEntry, headingBoundary);
    return { header, timestamp: match[2], start, bodyStart, end, body: text.slice(bodyStart, end), context, agent: isStrict ? match[4] : match[4], session: isStrict ? match[5] : match[5], strict: isStrict };
  });
}

export function validateDocument(text: string, policy: LogPolicy, allowLegacy = false): Entry[] {
  const found = entries(text, policy, allowLegacy);
  for (const entry of found) {
    const date = new Date(entry.timestamp);
    const normalized = Number.isNaN(date.valueOf()) ? "" : entry.timestamp.includes("T") ? date.toISOString().replace(/\.\d{3}Z$/, "Z") : date.toISOString().slice(0, 10);
    if (normalized !== entry.timestamp) throw new ProtectedLogError("entry timestamp is invalid");
  }
  if (!allowLegacy && new Set(found.map((entry) => entry.header)).size !== found.length) throw new ProtectedLogError("duplicate entry identity");
  if (!allowLegacy && policy.ordering === "newest") {
    for (let index = 1; index < found.length; index++) if (found[index - 1].timestamp < found[index].timestamp) throw new ProtectedLogError("entries are not newest-first");
  }
  for (const entry of found) {
    for (const match of matches(tracePattern, entry.body)) if (invalidTraceValues.has(match[1].trim().toLowerCase())) throw new ProtectedLogError("invalid backward trace");
    for (const match of matches(forwardPattern, entry.body)) if (!match[1].trim()) throw new ProtectedLogError("invalid forward trace");
  }
  return found;
}

function traceDisplay(header: string): string { return header.replace(/^[-*]\s+/, ""); }

function resolveTarget(reference: string, found: Entry[]): string {
  let candidates = found.filter((entry) => entry.header === reference || traceDisplay(entry.header) === reference);
  if (!candidates.length) {
    const stable = /^\s*(?:[-*]\s+)?\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\](?:\s+\[[^\]]+\])?(?:\s+@([A-Za-z][A-Za-z0-9_-]*)(?:\s+\[session:([^\]]+)\])?)?\s*$/.exec(reference);
    if (stable) {
      candidates = found.filter((entry) => (stable[1].includes("T") ? entry.timestamp === stable[1] : entry.timestamp.slice(0, 10) === stable[1]) && (!stable[2] || entry.agent === stable[2]) && (!stable[3] || entry.session === stable[3]));
    }
  }
  if (!candidates.length) throw new ProtectedLogError("backward trace target does not resolve; use a complete existing header or [timestamp] @Agent [session:cli:id]");
  if (candidates.length > 1) throw new ProtectedLogError("backward trace target is ambiguous");
  return candidates[0].header;
}

function projectFor(path: string, runtime: Record<string, unknown>): string {
  const canonical = resolve(path);
  const globalRoot = resolve(homedir(), ".agent-memory");
  const relativePath = relative(globalRoot, canonical);
  const globalRelative = relativePath.split(/[\\/]/);
  let derived: string | undefined;
  const underGlobalRoot = relativePath !== ".." && !relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(relativePath);
  if (underGlobalRoot) {
    derived = "universal";
    if (globalRelative[0] === "agents" && globalRelative.length === 4 && globalRelative[2] === "brain" && runtime.project) derived = undefined;
  } else {
    const parts = canonical.split(/[\\/]/);
    const memoryIndex = Math.max(...projectMemoryDirectories.map((directory) => parts.lastIndexOf(directory)));
    if (memoryIndex > 0) derived = parts[memoryIndex - 1];
  }
  const supplied = typeof runtime.project === "string" ? runtime.project.trim() : "";
  const project = supplied || derived || "";
  if (!project || ["unknown", "current", "placeholder"].includes(project)) throw new ProtectedLogError("project metadata is missing or invalid");
  if (supplied && derived && supplied !== derived) throw new ProtectedLogError("project metadata does not match canonical target path");
  return project;
}

function runtimeFields(path: string, runtime: Record<string, unknown>, policy: LogPolicy): { context: string; agent: string; session: string } {
  const rawSession = String(runtime.session_id || process.env.CODEX_SESSION_ID || process.env.AGENT_SESSION_ID || "").trim();
  let cli = String(runtime.cli || runtime.runtime || process.env.AGENT_CLI || "").trim().toLowerCase();
  let sessionId = rawSession;
  if (rawSession.includes(":")) {
    const [prefix, ...rest] = rawSession.split(":");
    if (cli && cli !== prefix.toLowerCase()) throw new ProtectedLogError("runtime CLI and session metadata disagree");
    cli ||= prefix.toLowerCase();
    sessionId = rest.join(":");
  }
  const session = `${cli}:${sessionId}`;
  if (!validSession(session)) throw new ProtectedLogError("runtime session metadata is missing or invalid");
  const claimed = String(runtime.agent || runtime.active_agent || "").trim();
  const active = String(process.env.AGENT_NAME || "").trim();
  const agent = claimed || active;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(agent)) throw new ProtectedLogError("active agent metadata is missing or invalid");
  if (claimed && active && claimed.toLowerCase() !== active.toLowerCase()) throw new ProtectedLogError(
    `--agent ${claimed} does not match the harness-provided active agent ${active}`,
    "Pass the agent name the harness set in AGENT_NAME, or unset AGENT_NAME when no harness identity is available."
  );
  const context = policy.requireContext ? projectFor(path, runtime) : "";
  return { context, agent, session };
}

function insertForward(text: string, found: Entry[], target: string, newHeader: string): string {
  const entry = found.find((item) => item.header === target);
  if (!entry) throw new ProtectedLogError("backward trace target does not resolve");
  const forward = `  - ↪ trace-forward: ${traceDisplay(newHeader)}`;
  if (entry.body.includes(forward)) throw new ProtectedLogError("reciprocal forward trace already exists");
  const addition = entry.body.endsWith("\n") ? `${forward}\n` : `\n${forward}\n`;
  return text.slice(0, entry.end) + addition + text.slice(entry.end);
}

function validateMutation(before: string, after: string, policy: LogPolicy): void {
  const oldEntries = validateDocument(before, policy, true);
  const newEntries = validateDocument(after, policy, true);
  const oldHeaders = oldEntries.map((entry) => entry.header);
  const additions = newEntries.filter((entry) => !oldHeaders.includes(entry.header));
  if (additions.length !== 1) throw new ProtectedLogError("mutation must add exactly one entry");
  const added = additions[0];
  if (oldHeaders.some((header) => !newEntries.some((entry) => entry.header === header))) throw new ProtectedLogError("historical entry was removed");
  const historical = newEntries.map((entry) => entry.header).filter((header) => header !== added.header);
  if (historical.join("\0") !== oldHeaders.join("\0")) throw new ProtectedLogError("historical entries were reordered");
  const at = newEntries.findIndex((entry) => entry.header === added.header);
  if (policy.ordering === "newest" && at !== 0) throw new ProtectedLogError("new chronological entry must be first");
  if (policy.ordering === null && oldEntries.length && at === newEntries.length - 1) throw new ProtectedLogError("new topic entry may not be appended at the bottom");
  if (policy.ordering === "newest" && oldEntries.length && added.timestamp < oldEntries.map((entry) => entry.timestamp).sort().at(-1)!) throw new ProtectedLogError("new entry timestamp regresses");
  const traces = matches(tracePattern, added.body);
  if (traces.length !== 1 || matches(forwardPattern, added.body).length) throw new ProtectedLogError("new entry needs exactly one backward trace");
  const value = traces[0][1].trim();
  if (value === "none (new topic)") {
    if (oldEntries.some((entry) => entry.body !== newEntries.find((item) => item.header === entry.header)?.body)) throw new ProtectedLogError("none exception cannot change historical entries");
    return;
  }
  if (!value.startsWith("relates-to ")) throw new ProtectedLogError("backward trace must resolve with relates-to or none");
  const target = resolveTarget(value.slice("relates-to ".length), oldEntries);
  for (const entry of oldEntries) {
    const current = newEntries.find((item) => item.header === entry.header)!;
    if (entry.header === target) {
      if (!current.body.startsWith(entry.body)) throw new ProtectedLogError("historical entry prose changed");
      const suffix = current.body.slice(entry.body.length);
      const expected = `  - ↪ trace-forward: ${traceDisplay(added.header)}`;
      if (![expected, `${expected}\n`, `\n${expected}`, `\n${expected}\n`].includes(suffix)) throw new ProtectedLogError("historical entry changed outside its permitted forward trace");
    } else if (current.body !== entry.body) throw new ProtectedLogError("historical entry changed");
  }
  if (added.timestamp <= oldEntries.find((entry) => entry.header === target)!.timestamp) throw new ProtectedLogError("backward trace target is not older than new entry");
}

function withLock<T>(path: string, operation: () => T): T {
  const lockPath = `${path}.lock`;
  let descriptor: number | undefined;
  const started = Date.now();
  while (descriptor === undefined) {
    try { descriptor = openSync(lockPath, "wx", 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || Date.now() - started > 30_000) throw new ProtectedLogError(`could not acquire protected-log lock: ${String(error)}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  try { return operation(); }
  finally { closeSync(descriptor); unlinkSync(lockPath); }
}

function atomicWrite(path: string, content: string): void {
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporary, "wx", existsSync(path) ? statSync(path).mode & 0o777 : 0o600);
    writeFileSync(descriptor, content, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, path);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function workLogInsertion(text: string): number | null {
  const heading = /^## Work Log\s*$/m.exec(text);
  if (!heading) return null;
  const after = heading.index + heading[0].length;
  const next = /^##\s+/m.exec(text.slice(after));
  const limit = next ? after + next.index : text.length;
  const entries = matches(headerPattern, text).filter((entry) => entry.index >= after && entry.index < limit);
  return entries.length ? entries[0].index : limit;
}

export function writeEntry(path: string, content: string, runtime: Record<string, unknown>, trace: string): string {
  const canonical = canonicalProtectedLogPath(path);
  const policy = policyForPath(canonical);
  if (!existsSync(dirname(canonical))) throw new ProtectedLogError("protected log parent does not exist");
  return withLock(canonical, () => {
    const before = existsSync(canonical) ? readFileSync(canonical, "utf8") : "";
    const oldEntries = validateDocument(before, policy, true);
    const { context, agent, session } = runtimeFields(canonical, runtime, policy);
    if (!content.trim()) throw new ProtectedLogError("entry content is empty");
    if (matches(tracePattern, content).length || matches(forwardPattern, content).length) throw new ProtectedLogError("writer owns trace lines");
    if (!trace.trim()) throw new ProtectedLogError("new entry needs a backward trace or exact none exception");
    const target = trace === "none (new topic)" ? null : resolveTarget(trace.trim(), oldEntries);
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const prefix = oldEntries[0]?.header.match(/^[-*]\s+/)?.[0] ?? "";
    const firstLine = content.trim().replace(/^\n+|\n+$/g, "").split(/\r?\n/, 1)[0];
    const header = `${prefix}[${timestamp}]${context ? ` [${context}]` : ""} @${agent} [session:${session}]: ${firstLine}`;
    const rest = content.trim().replace(/^\n+|\n+$/g, "").split(/\r?\n/).slice(1).join("\n");
    const traceLine = target === null ? "  - ↪ trace: none (new topic)" : `  - ↪ trace: relates-to ${traceDisplay(target)}`;
    const rendered = `${header}\n${rest ? `${rest}\n` : ""}${traceLine}\n\n`;
    let updated = target ? insertForward(before, oldEntries, target, header) : before;
    const insertion = workLogInsertion(updated) ?? oldEntries[0]?.start ?? updated.length;
    const after = updated.slice(0, insertion) + rendered + updated.slice(insertion);
    validateMutation(before, after, policy);
    atomicWrite(canonical, after);
    return header;
  });
}

function resolveRepairEntry(reference: string, found: Entry[]): Entry {
  let candidates = found.filter((entry) => entry.header === reference || traceDisplay(entry.header) === reference);
  if (!candidates.length) {
    const stable = /^\s*(?:[-*]\s+)?\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\](?:\s+\[[^\]]+\])?(?:\s+@([A-Za-z][A-Za-z0-9_-]*)(?:\s+\[session:([^\]]+)\])?)?\s*$/.exec(reference);
    if (stable) candidates = found.filter((entry) => (stable[1].includes("T") ? entry.timestamp === stable[1] : entry.timestamp.slice(0, 10) === stable[1]) && (!stable[2] || entry.agent === stable[2]) && (!stable[3] || entry.session === stable[3]));
  }
  if (!candidates.length) throw new ProtectedLogError("repair header does not resolve to an entry; pass the exact header or a unique stable reference");
  if (candidates.length > 1) throw new ProtectedLogError("repair header is ambiguous; include timestamp, agent and session");
  return candidates[0];
}

function atomicMutation(path: string, policy: LogPolicy, mutate: (before: string, found: Entry[]) => string): void {
  const canonical = canonicalProtectedLogPath(path);
  withLock(canonical, () => {
    const before = readFileSync(canonical, "utf8");
    const found = validateDocument(before, policy, true);
    const after = mutate(before, found);
    validateDocument(after, policy, true);
    atomicWrite(canonical, after);
  });
}

export function repairBulletTraceMarkers(path: string, header: string, runtime: Record<string, unknown> = {}): void {
  const canonical = canonicalProtectedLogPath(path);
  const policy = policyForPath(canonical);
  runtimeFields(canonical, runtime, policy);
  atomicMutation(canonical, policy, (before, found) => {
    const entry = found.find((item) => item.header === header);
    if (!entry || found.filter((item) => item.header === header).length !== 1) throw new ProtectedLogError("repair header must resolve to exactly one entry");
    const original = before.slice(entry.start, entry.end);
    const repaired = original.replace(/↪ trace: relates-to - /g, "↪ trace: relates-to ").replace(/↪ trace-forward: - /g, "↪ trace-forward: ");
    if (repaired === original) throw new ProtectedLogError("entry has no bullet-prefixed trace markers to repair");
    return before.slice(0, entry.start) + repaired + before.slice(entry.end);
  });
}

export function repairBackwardTrace(path: string, header: string, trace: string, runtime: Record<string, unknown>): string {
  const canonical = canonicalProtectedLogPath(path);
  const policy = policyForPath(canonical);
  runtimeFields(canonical, runtime, policy);
  return withLock(canonical, () => {
    const before = readFileSync(canonical, "utf8");
    const oldEntries = validateDocument(before, policy, true);
    const source = resolveRepairEntry(header.trim(), oldEntries);
    const targetHeader = resolveTarget(trace.trim(), oldEntries);
    const target = oldEntries.find((entry) => entry.header === targetHeader)!;
    if (!source.strict) throw new ProtectedLogError("repair source entry must use strict writer metadata");
    if (source.timestamp <= target.timestamp) throw new ProtectedLogError("repair target must be older than source entry");
    const sourceTraces = matches(tracePattern, source.body);
    if (sourceTraces.length !== 1 || sourceTraces[0][1].trim() !== "none (new topic)") throw new ProtectedLogError("repair source entry must contain exactly one none (new topic) trace");
    const replacement = `relates-to ${traceDisplay(targetHeader)}`;
    const traceOffset = source.body.indexOf(sourceTraces[0][1]);
    let updated = before.slice(0, source.bodyStart + traceOffset) + replacement + before.slice(source.bodyStart + traceOffset + sourceTraces[0][1].length);
    const refreshed = validateDocument(updated, policy, true);
    updated = insertForward(updated, refreshed, targetHeader, source.header);
    const newEntries = validateDocument(updated, policy, true);
    if (newEntries.map((entry) => entry.header).join("\0") !== oldEntries.map((entry) => entry.header).join("\0")) throw new ProtectedLogError("trace repair changed entry identities or ordering");
    for (const oldEntry of oldEntries) {
      const current = newEntries.find((entry) => entry.header === oldEntry.header)!;
      if (oldEntry.header === source.header) {
        const expected = oldEntry.body.slice(0, traceOffset) + replacement + oldEntry.body.slice(traceOffset + sourceTraces[0][1].length);
        if (current.body !== expected) throw new ProtectedLogError("trace repair changed source entry outside its backward trace");
      } else if (oldEntry.header === targetHeader) {
        if (!current.body.startsWith(oldEntry.body) || !current.body.slice(oldEntry.body.length).includes(`trace-forward: ${traceDisplay(source.header)}`)) throw new ProtectedLogError("trace repair changed target entry outside its reciprocal trace");
      } else if (current.body !== oldEntry.body) throw new ProtectedLogError("trace repair changed an unrelated historical entry");
    }
    atomicWrite(canonical, updated);
    return source.header;
  });
}

export function repairEntryHeader(path: string, header: string, replacement: string, runtime: Record<string, unknown>): string {
  const canonical = canonicalProtectedLogPath(path);
  const policy = policyForPath(canonical);
  const { agent } = runtimeFields(canonical, runtime, policy);
  return withLock(canonical, () => {
    const before = readFileSync(canonical, "utf8");
    const oldEntries = validateDocument(before, policy, true);
    const entry = resolveRepairEntry(header.trim(), oldEntries);
    if (!entry.strict) throw new ProtectedLogError("repair source entry predates strict writer metadata");
    if (entry.agent !== agent) throw new ProtectedLogError(`agents may repair only their own entries; this entry belongs to @${entry.agent}`);
    const normalizedReplacement = replacement.trim().startsWith(entry.header.match(/^[-*]\s+/)?.[0] || "") ? replacement.trim() : `${entry.header.match(/^[-*]\s+/)?.[0] || ""}${replacement.trim()}`;
    const fields = (line: string): string[] => {
      const match = /^([-*]\s+)?\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\](?: \[([A-Za-z0-9][A-Za-z0-9._-]*)\])? @([A-Za-z][A-Za-z0-9_-]*) \[session:((?:claude|codex|agy|antigravity|opencode|cursor):[A-Za-z0-9][A-Za-z0-9._-]*)\]: (\S.*)$/.exec(line);
      if (!match) throw new ProtectedLogError("repair replacement is not a complete entry header");
      return [match[1] || "", match[2], match[3] || "", match[4], match[5], match[6]];
    };
    const oldFields = fields(entry.header);
    const newFields = fields(normalizedReplacement);
    if (oldFields.slice(0, 5).join("\0") !== newFields.slice(0, 5).join("\0")) throw new ProtectedLogError("repair may not change entry metadata");
    const oldTitle = oldFields[5];
    const newTitle = newFields[5];
    if (!oldTitle.endsWith(newTitle) || newTitle === oldTitle) throw new ProtectedLogError("repair may only drop a leading segment of the subject");
    const dropped = oldTitle.slice(0, oldTitle.length - newTitle.length);
    const nested = /^(?:[-*]\s+)?(?:\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\])?(?:\s*\[[A-Za-z0-9][A-Za-z0-9._-]*\])*\s*@([A-Za-z][A-Za-z0-9_-]*)\s*\[session:((?:claude|codex|agy|antigravity|opencode|cursor):[A-Za-z0-9][A-Za-z0-9._-]*)\]:\s*$/.exec(dropped);
    if (!nested || nested[1] && nested[1] !== oldFields[1] || nested[2] !== entry.agent || !entry.session.startsWith(nested[3])) throw new ProtectedLogError("repair may only drop a nested copy of this entry's own header");
    if (oldEntries.some((item) => item.header === normalizedReplacement)) throw new ProtectedLogError("repair replacement duplicates an existing entry");
    const oldDisplay = traceDisplay(entry.header);
    const newDisplay = traceDisplay(normalizedReplacement);
    const rewrite = (text: string): string => text.replace(/(^[^\n]*↪\s*trace(?:-forward)?:[^\n]*)/gm, (line) => line.replaceAll(oldDisplay, newDisplay));
    let updated = before.slice(0, entry.start) + normalizedReplacement + before.slice(entry.start + entry.header.length);
    updated = rewrite(updated);
    const newEntries = validateDocument(updated, policy, true);
    if (newEntries.map((item) => item.header).join("\0") !== oldEntries.map((item) => item.header === entry.header ? normalizedReplacement : item.header).join("\0")) throw new ProtectedLogError("repair changed entry identities or ordering");
    const expectedBodies = oldEntries.map((item) => rewrite(item.body));
    if (newEntries.some((item, index) => item.body !== expectedBodies[index])) throw new ProtectedLogError("repair changed text outside the header and its trace references");
    const oldPreamble = oldEntries.length ? before.slice(0, oldEntries[0].start) : before;
    const newPreamble = newEntries.length ? updated.slice(0, newEntries[0].start) : updated;
    if (oldPreamble !== newPreamble) throw new ProtectedLogError("protected log preamble changed");
    if (oldDisplay !== newDisplay && updated.includes(oldDisplay)) throw new ProtectedLogError("repair left a stale reference to the old header");
    atomicWrite(canonical, updated);
    return normalizedReplacement;
  });
}

export function retagEntry(path: string, header: string, runtime: Record<string, unknown>): string {
  const canonical = canonicalProtectedLogPath(path);
  const parts = canonical.split(/[\\/]/);
  const memoryIndex = Math.max(...projectMemoryDirectories.map((directory) => parts.lastIndexOf(directory)));
  const relativePath = parts.slice(memoryIndex + 1);
  if (memoryIndex < 0 || relativePath.length !== 4 || relativePath[0] !== "agents" || relativePath[2] !== "brain") throw new ProtectedLogError("retag applies only to agent brain files under the global or selected project memory directory");
  const policy = policyForPath(canonical);
  if (!policy.requireContext) throw new ProtectedLogError("retag requires a log whose entries carry a project tag");
  const { context: project, agent } = runtimeFields(canonical, runtime, policy);
  return withLock(canonical, () => {
    const before = readFileSync(canonical, "utf8");
    const oldEntries = validateDocument(before, policy, true);
    const oldHeader = resolveTarget(header.trim(), oldEntries);
    const entry = oldEntries.find((item) => item.header === oldHeader)!;
    if (!entry.strict) throw new ProtectedLogError("retag source entry must use strict writer metadata");
    if (entry.agent !== agent) throw new ProtectedLogError("agents may retag only their own entries");
    if (entry.context === project) throw new ProtectedLogError("entry already carries that project tag");
    const newHeader = oldHeader.replace(`] [${entry.context}] @`, `] [${project}] @`);
    if (newHeader === oldHeader || oldEntries.some((item) => item.header === newHeader)) throw new ProtectedLogError("retag could not produce a unique new header");
    const oldDisplay = traceDisplay(oldHeader);
    const newDisplay = traceDisplay(newHeader);
    let updated = before.slice(0, entry.start) + newHeader + before.slice(entry.start + oldHeader.length);
    updated = updated.replace(/(^[^\n]*↪\s*trace(?:-forward)?:[^\n]*)/gm, (line) => line.replaceAll(oldDisplay, newDisplay));
    const newEntries = validateDocument(updated, policy, true);
    const expected = oldEntries.map((item) => item.header === oldHeader ? newHeader : item.header);
    if (newEntries.map((item) => item.header).join("\0") !== expected.join("\0")) throw new ProtectedLogError("retag changed entry identities or ordering");
    if (updated.replaceAll(newDisplay, oldDisplay) !== before) throw new ProtectedLogError("retag changed text other than the header and its trace references");
    const oldPreamble = oldEntries.length ? before.slice(0, oldEntries[0].start) : before;
    const newPreamble = newEntries.length ? updated.slice(0, newEntries[0].start) : updated;
    if (oldPreamble !== newPreamble) throw new ProtectedLogError("protected log preamble changed");
    atomicWrite(canonical, updated);
    return newHeader;
  });
}

function preambleOf(text: string, found: Entry[]): string {
  return found.length ? text.slice(0, found[0].start) : text;
}

function rewriteTraceReferences(text: string, oldDisplay: string, newDisplay: string): string {
  return text.replace(/(^[^\n]*↪\s*trace(?:-forward)?:[^\n]*)/gm, (line) => line.replaceAll(oldDisplay, newDisplay));
}

function hasStaleReference(found: Entry[], display: string): boolean {
  return found.some((entry) => {
    const values = [...matches(tracePattern, entry.body), ...matches(forwardPattern, entry.body)].map((match) => match[1].trim());
    return values.some((value) => value === display || value === `relates-to ${display}`);
  });
}

function referenceResolvesTo(value: string, found: Entry[], target: Entry): boolean {
  const candidate = value.startsWith("relates-to ") ? value.slice("relates-to ".length).trim() : value.trim();
  if (!candidate || candidate === "none (new topic)") return false;
  if (candidate.includes(target.header) || candidate.includes(traceDisplay(target.header))) return true;
  const timestamp = /\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\]/.exec(candidate)?.[1];
  if (timestamp) {
    const agent = /@([A-Za-z][A-Za-z0-9_-]*)/.exec(candidate)?.[1];
    const session = /\[session:([^\]]+)\]/.exec(candidate)?.[1];
    const sameTimestamp = timestamp === target.timestamp || (timestamp.length === 10 && target.timestamp.startsWith(timestamp));
    if (sameTimestamp && (!agent || agent === target.agent) && (!session || session === target.session)) return true;
  }
  try { return resolveTarget(candidate, found) === target.header; }
  catch (error) { return error instanceof ProtectedLogError && /ambiguous/.test(error.message); }
}

function assertSingleEntryMutation(original: Entry[], updated: Entry[], header: string, expectedBody: string, before: string, after: string): void {
  if (updated.length !== original.length) throw new ProtectedLogError("mutation changed the number of entries");
  if (updated.some((entry, index) => entry.header !== original[index].header)) throw new ProtectedLogError("mutation changed entry identities or ordering");
  const targetIndex = original.findIndex((entry) => entry.header === header);
  if (updated[targetIndex].body !== expectedBody) throw new ProtectedLogError("mutation produced an unexpected body");
  for (let index = 0; index < original.length; index++) {
    if (index !== targetIndex && updated[index].body !== original[index].body) throw new ProtectedLogError("mutation changed an unrelated entry");
  }
  if (preambleOf(before, original) !== preambleOf(after, updated)) throw new ProtectedLogError("protected log preamble changed");
}

export function editEntry(path: string, header: string, content: string, runtime: Record<string, unknown>): string {
  const canonical = canonicalProtectedLogPath(path);
  const policy = policyForPath(canonical);
  const { agent } = runtimeFields(canonical, runtime, policy);
  return withLock(canonical, () => {
    const before = readFileSync(canonical, "utf8");
    const found = validateDocument(before, policy, true);
    const entry = resolveRepairEntry(header.trim(), found);
    if (!entry.strict) throw new ProtectedLogError("entry predates strict writer metadata, so it cannot be edited; add a correcting entry instead");
    if (entry.agent !== agent) throw new ProtectedLogError(`agents may edit only their own entries; this entry belongs to @${entry.agent}`);
    const prose = content.trim();
    if (!prose) throw new ProtectedLogError("edited content is empty");
    if (matches(tracePattern, prose).length || matches(forwardPattern, prose).length) throw new ProtectedLogError("the writer owns trace lines; edit only the entry prose");
    const traces = matches(tracePattern, entry.body);
    if (traces.length !== 1) throw new ProtectedLogError("entry must contain exactly one backward trace before it can be edited");
    const traceIndex = Math.min(traces[0].index ?? 0, ...matches(forwardPattern, entry.body).map((match) => match.index ?? 0));
    const rebuiltBody = `${prose}\n${entry.body.slice(traceIndex)}`;
    const after = before.slice(0, entry.bodyStart) + rebuiltBody + before.slice(entry.end);
    const updated = validateDocument(after, policy, true);
    assertSingleEntryMutation(found, updated, entry.header, rebuiltBody, before, after);
    atomicWrite(canonical, after);
    return entry.header;
  });
}

export function rewriteEntry(path: string, header: string, content: string, runtime: Record<string, unknown>): string {
  const canonical = canonicalProtectedLogPath(path);
  const policy = policyForPath(canonical);
  const { agent } = runtimeFields(canonical, runtime, policy);
  return withLock(canonical, () => {
    const before = readFileSync(canonical, "utf8");
    const found = validateDocument(before, policy, true);
    const entry = resolveRepairEntry(header.trim(), found);
    if (!entry.strict) throw new ProtectedLogError("entry predates strict writer metadata, so it cannot be rewritten; add a correcting entry instead");
    if (entry.agent !== agent) throw new ProtectedLogError(`agents may rewrite only their own entries; this entry belongs to @${entry.agent}`);
    const prose = content.trim();
    if (!prose) throw new ProtectedLogError("rewritten content is empty");
    if (matches(tracePattern, prose).length || matches(forwardPattern, prose).length) throw new ProtectedLogError("the writer owns trace lines; rewrite only the subject and prose");
    const traces = matches(tracePattern, entry.body);
    if (traces.length !== 1) throw new ProtectedLogError("entry must contain exactly one backward trace before it can be rewritten");
    const lines = prose.split(/\r?\n/);
    const subject = lines[0].trim();
    if (!subject) throw new ProtectedLogError("rewritten subject is empty");
    const oldSubject = entry.header.slice(entry.header.indexOf("]: ") + 3);
    if (subject === oldSubject) throw new ProtectedLogError("rewrite would not change the subject; use --edit to change only the prose");
    const prefix = entry.header.match(/^[-*]\s+/)?.[0] ?? "";
    const newHeader = `${prefix}[${entry.timestamp}]${entry.context ? ` [${entry.context}]` : ""} @${entry.agent} [session:${entry.session}]: ${subject}`;
    if (found.some((item) => item.header === newHeader)) throw new ProtectedLogError("rewrite would duplicate an existing entry identity");
    const rest = lines.slice(1).join("\n");
    const traceIndex = Math.min(traces[0].index ?? 0, ...matches(forwardPattern, entry.body).map((match) => match.index ?? 0));
    const newBody = rest ? `${rest}\n${entry.body.slice(traceIndex)}` : entry.body.slice(traceIndex);
    let after = before.slice(0, entry.start) + `${newHeader}\n${newBody}` + before.slice(entry.end);
    const oldDisplay = traceDisplay(entry.header);
    const newDisplay = traceDisplay(newHeader);
    after = rewriteTraceReferences(after, oldDisplay, newDisplay);
    const updated = validateDocument(after, policy, true);
    const expectedHeaders = found.map((item) => item.header === entry.header ? newHeader : item.header);
    if (updated.length !== expectedHeaders.length || updated.some((item, index) => item.header !== expectedHeaders[index])) throw new ProtectedLogError("rewrite changed entry identities or ordering");
    const expectedBodies = found.map((item) => item.header === entry.header ? newBody : rewriteTraceReferences(item.body, oldDisplay, newDisplay));
    if (updated.some((item, index) => item.body !== expectedBodies[index])) throw new ProtectedLogError("rewrite changed text outside the entry and its trace references");
    if (preambleOf(before, found) !== preambleOf(after, updated)) throw new ProtectedLogError("protected log preamble changed");
    if (hasStaleReference(updated, oldDisplay)) throw new ProtectedLogError("rewrite left a stale reference to the old header");
    atomicWrite(canonical, after);
    return newHeader;
  });
}

export function deleteEntry(path: string, header: string, runtime: Record<string, unknown>): { header: string; removed: string } {
  const canonical = canonicalProtectedLogPath(path);
  const policy = policyForPath(canonical);
  const { agent } = runtimeFields(canonical, runtime, policy);
  return withLock(canonical, () => {
    const before = readFileSync(canonical, "utf8");
    const found = validateDocument(before, policy, true);
    const entry = resolveRepairEntry(header.trim(), found);
    if (!entry.strict) throw new ProtectedLogError("entry predates strict writer metadata, so it cannot be deleted; add a correcting entry instead");
    if (entry.agent !== agent) throw new ProtectedLogError(`agents may delete only their own entries; this entry belongs to @${entry.agent}`);
    const reasons: string[] = [];
    const ownTraces = matches(tracePattern, entry.body);
    if (ownTraces.length !== 1) reasons.push("it does not have exactly one backward trace");
    else if (ownTraces[0][1].trim() !== "none (new topic)") reasons.push("it traces to an older entry");
    if (matches(forwardPattern, entry.body).length) reasons.push("a later entry traces to it");
    const referenced = found.some((item) => item.header !== entry.header && [...matches(tracePattern, item.body), ...matches(forwardPattern, item.body)].some((match) => referenceResolvesTo(match[1], found, entry)));
    if (referenced) reasons.push("another entry references it");
    if (reasons.length) throw new ProtectedLogError(
      `this entry cannot be deleted because ${reasons.join(" and ")}`,
      "Delete is allowed only for an entry with no trace links. Add a new entry that records the correction, and pass this entry's header as --trace so the correction stays visible and the original remains traceable."
    );
    const after = before.slice(0, entry.start) + before.slice(entry.end);
    const updated = validateDocument(after, policy, true);
    const expected = found.filter((item) => item.header !== entry.header);
    if (updated.length !== expected.length || updated.some((item, index) => item.header !== expected[index].header)) throw new ProtectedLogError("delete changed entry identities or ordering");
    if (updated.some((item, index) => item.body !== expected[index].body)) throw new ProtectedLogError("delete changed an unrelated entry");
    const preamble = preambleOf(before, found);
    const newPreamble = updated.length ? after.slice(0, updated[0].start) : after.slice(0, preamble.length);
    if (newPreamble !== preamble) throw new ProtectedLogError("protected log preamble changed");
    atomicWrite(canonical, after);
    return { header: entry.header, removed: before.slice(entry.start, entry.end) };
  });
}
