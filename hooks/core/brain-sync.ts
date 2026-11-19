import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { shortSessionLabel, STATE_DIR } from "../../common";
import { projectMemoryRoot } from "../../memory-paths";

export interface MemoryToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface MemoryTranscriptEvent {
  role: string;
  type?: string;
  text: string;
  toolCalls: MemoryToolCall[];
  toolResults: Array<{ isError: boolean }>;
}

export interface BrainSyncRequest {
  source: string;
  sessionId: string;
  sessionLabel: string;
  cwd: string;
  toolName?: string;
  events: MemoryTranscriptEvent[];
}

type Activity = {
  totalScore: number;
  toolCounts: Record<string, number>;
  filesChanged: Set<string>;
  userMessageCount: number;
  lastSyncIndex: number;
  eventsSinceSync: MemoryTranscriptEvent[];
};

type UnsyncMarker = {
  session_id: string;
  agent: string;
  source: string;
  project: string;
  timestamp: string;
  score: number;
  files_changed: string[];
  tool_counts: Record<string, number>;
};

type BrainSyncSessionState = {
  source: string;
  sessionId: string;
  cwd: string;
  status: "active" | "ended" | "recovered";
  startedAt: number;
  lastSeenAt: number;
  endedAt?: number;
  recoveredAt?: number;
};

const agentsRoot = join(homedir(), ".agent-memory", "agents");
const markerRoot = join(STATE_DIR, "brain-sync", "markers");
const unsyncRoot = join(STATE_DIR, "brain-sync", "unsynced");
const sessionRoot = join(STATE_DIR, "brain-sync", "sessions");
const heavyThreshold = 15;
const lightThreshold = 9;
const sessionRetentionMs = 30 * 24 * 60 * 60 * 1000;
const sessionFileLimit = 1000;
const toolWeights: Record<string, number> = { Edit: 3, Write: 3, Bash: 1.5, Task: 2, Read: 0.5, Glob: 0.25, Grep: 0.25, TodoWrite: 0, WebFetch: 1, WebSearch: 1 };

function sessionFile(source: string, sessionId: string): string {
  const key = createHash("sha256").update(`${source}:${sessionId}`).digest("hex").slice(0, 24);
  return join(sessionRoot, `${key}.jsonl`);
}

function sessionStateFile(source: string, sessionId: string): string {
  const key = createHash("sha256").update(`${source}:${sessionId}`).digest("hex").slice(0, 24);
  return join(sessionRoot, `${key}.state.json`);
}

function writeSessionState(path: string, state: BrainSyncSessionState): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state)}\n`, "utf8");
  renameSync(temporary, path);
}

export function hasBrainSyncSessionState(source: string, sessionId: string): boolean {
  return Boolean(sessionId && existsSync(sessionStateFile(source, sessionId)));
}

export function recordBrainSyncSessionEvent(source: string, sessionId: string, cwd: string, event: string): void {
  if (!sessionId) return;
  mkdirSync(sessionRoot, { recursive: true });
  const path = sessionStateFile(source, sessionId);
  const now = Date.now();
  let state: BrainSyncSessionState;
  try { state = JSON.parse(readFileSync(path, "utf8")) as BrainSyncSessionState; }
  catch { state = { source, sessionId, cwd, status: "active", startedAt: now, lastSeenAt: now }; }
  state.source = source;
  state.sessionId = sessionId;
  state.cwd = cwd || state.cwd;
  if (event === "SessionEnd") {
    state.status = "ended";
    state.endedAt = now;
  } else {
    if (event === "SessionStart" || state.status !== "active") state.startedAt = now;
    state.status = "active";
    delete state.endedAt;
    delete state.recoveredAt;
  }
  state.lastSeenAt = now;
  writeSessionState(path, state);
}

export function storeBrainSyncSnapshot(source: string, sessionId: string, events: MemoryTranscriptEvent[]): void {
  if (!sessionId) return;
  mkdirSync(sessionRoot, { recursive: true });
  const path = sessionFile(source, sessionId);
  const isNewSession = !existsSync(path);
  const lines = events.slice(-2000).map((event) => JSON.stringify({ event }));
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${lines.join("\n")}${lines.length ? "\n" : ""}`, "utf8");
  renameSync(temporary, path);
  if (isNewSession) pruneBrainSyncSessions();
}

function pruneBrainSyncSessions(): void {
  const now = Date.now();
  const files = readdirSync(sessionRoot)
    .filter((name) => name.endsWith(".jsonl"))
    .flatMap((name) => {
      const path = join(sessionRoot, name);
      try { return [{ path, modifiedAt: statSync(path).mtimeMs }]; }
      catch { return []; }
    });
  for (const file of files.filter(({ modifiedAt }) => now - modifiedAt > sessionRetentionMs)) {
    try { unlinkSync(file.path); } catch { }
  }
  const retained = files.filter(({ modifiedAt }) => now - modifiedAt <= sessionRetentionMs).sort((left, right) => right.modifiedAt - left.modifiedAt);
  for (const file of retained.slice(sessionFileLimit)) {
    try { unlinkSync(file.path); } catch { }
  }
  const states = readdirSync(sessionRoot)
    .filter((name) => name.endsWith(".state.json"))
    .flatMap((name) => {
      const path = join(sessionRoot, name);
      try { return [{ path, modifiedAt: statSync(path).mtimeMs }]; }
      catch { return []; }
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);
  for (const state of states.filter(({ modifiedAt }) => now - modifiedAt > sessionRetentionMs)) {
    try { unlinkSync(state.path); } catch { }
  }
  for (const state of states.filter(({ modifiedAt }) => now - modifiedAt <= sessionRetentionMs).slice(sessionFileLimit)) {
    try { unlinkSync(state.path); } catch { }
  }
}

export function appendBrainSyncEvent(source: string, sessionId: string, event: MemoryTranscriptEvent, eventId?: string): MemoryTranscriptEvent[] {
  if (!sessionId) return [];
  mkdirSync(sessionRoot, { recursive: true });
  const path = sessionFile(source, sessionId);
  const isNewSession = !existsSync(path);
  if (eventId && existsSync(path)) {
    const recent = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).slice(-200);
    if (recent.some((line) => {
      try { return (JSON.parse(line) as { id?: string }).id === eventId; }
      catch { return false; }
    })) return readBrainSyncEvents(source, sessionId);
  }
  appendFileSync(path, `${JSON.stringify({ id: eventId, event })}\n`, "utf8");
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length > 2000) writeFileSync(path, `${lines.slice(-2000).join("\n")}\n`, "utf8");
  if (isNewSession) pruneBrainSyncSessions();
  return lines.slice(-2000).flatMap((line) => {
    try { return [(JSON.parse(line) as { event: MemoryTranscriptEvent }).event]; }
    catch { return []; }
  });
}

export function readBrainSyncEvents(source: string, sessionId: string): MemoryTranscriptEvent[] {
  try {
    return readFileSync(sessionFile(source, sessionId), "utf8").split(/\r?\n/).filter(Boolean).slice(-2000).flatMap((line) => {
      try { return [(JSON.parse(line) as { event: MemoryTranscriptEvent }).event]; }
      catch { return []; }
    });
  } catch { return []; }
}

export function makeBrainSyncRequest(source: string, sessionId: string, cwd: string, events = readBrainSyncEvents(source, sessionId), toolName?: string): BrainSyncRequest {
  return { source, sessionId, sessionLabel: shortSessionLabel(source, sessionId) || `${source}:unknown`, cwd, toolName, events };
}

function discoverAgentDirectories(cwd: string): Array<{ name: string; root: string }> {
  const roots = [agentsRoot, join(projectMemoryRoot(cwd), "agents")];
  const found = new Map<string, { name: string; root: string }>();
  for (const root of roots) {
    try {
      for (const name of readdirSync(root)) {
        if (existsSync(join(root, name, "soul.md"))) found.set(name.toLowerCase(), { name, root });
      }
    } catch { }
  }
  return [...found.values()];
}

function agentBrainDirectory(agent: string, cwd: string): string {
  const projectDirectory = join(projectMemoryRoot(cwd), "agents", agent);
  return existsSync(join(projectDirectory, "soul.md")) ? join(projectDirectory, "brain") : join(agentsRoot, agent, "brain");
}

function toolCalls(events: MemoryTranscriptEvent[]): Array<{ event: MemoryTranscriptEvent; call: MemoryToolCall }> {
  return events.flatMap((event) => event.role === "assistant" ? event.toolCalls.map((call) => ({ event, call })) : []);
}

function portablePath(path: string): string { return path.replace(/\\/g, "/"); }

function detectAgent(events: MemoryTranscriptEvent[], cwd = process.cwd()): string | null {
  const agents = discoverAgentDirectories(cwd).map(({ name }) => name);
  const scores = new Map<string, number>();
  for (const { call } of toolCalls(events)) {
    const path = portablePath(String(call.input.file_path || call.input.filePath || ""));
    if (!path.includes("/agents/")) continue;
    for (const agent of agents) if (path.includes(`/agents/${agent}/`)) scores.set(agent, (scores.get(agent) || 0) + ((path.includes("/brain/") ? 3 : 1) * (["Edit", "Write"].includes(call.name) ? 2 : 1)));
  }
  if (!scores.size) for (const event of events) {
    if (event.role !== "user") continue;
    for (const agent of agents) {
      const namedAgent = new RegExp(`(?:\\bhey\\s+|\\b(?:you are|act as|become)\\s+@?|@)${agent}\\b`, "i");
      if (namedAgent.test(event.text)) scores.set(agent, (scores.get(agent) || 0) + 10);
    }
  }
  return [...scores].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function scoreActivity(events: MemoryTranscriptEvent[]): Omit<Activity, "lastSyncIndex" | "eventsSinceSync"> {
  const toolCounts: Record<string, number> = {};
  const filesChanged = new Set<string>();
  let userMessageCount = 0;
  for (const event of events) {
    if ((event.role === "user" || event.type === "user") && !event.toolResults.length && event.text.length > 10 && !event.text.startsWith("<system")) userMessageCount++;
    if (event.role !== "assistant") continue;
    for (const call of event.toolCalls) {
      toolCounts[call.name] = (toolCounts[call.name] || 0) + 1;
      const path = call.input.file_path;
      if (path && ["Edit", "Write"].includes(call.name)) filesChanged.add(String(path).split(/[\\/]/).slice(-2).join("/"));
    }
  }
  const totalScore = Object.entries(toolCounts).reduce((sum, [name, count]) => sum + count * (toolWeights[name] ?? 1), 0) + userMessageCount * 1.5;
  return { totalScore, toolCounts, filesChanged, userMessageCount };
}

type MemoryWrite = { path: string; text: string; protectedWriter: boolean };

function shellWords(command: string): string[] {
  const words: string[] = [];
  let word = "";
  let quote = "";
  let escaped = false;
  for (const character of command) {
    if (escaped) { word += character; escaped = false; continue; }
    if (character === "\\" && quote !== "'") { escaped = true; continue; }
    if (quote) { if (character === quote) quote = ""; else word += character; continue; }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (/\s/.test(character)) { if (word) words.push(word); word = ""; continue; }
    word += character;
  }
  if (escaped) word += "\\";
  if (word) words.push(word);
  return words;
}

function expandPath(path: string, cwd: string): string {
  const expanded = path.replace(/^~(?=\/)/, homedir()).replace(/\$HOME(?=\/)/g, homedir()).replace(/\$\{HOME\}/g, homedir());
  return resolve(isAbsolute(expanded) ? expanded : join(cwd, expanded));
}

function optionValue(words: string[], name: string): string | undefined {
  for (let index = 0; index < words.length; index++) {
    if (words[index] === name) return words[index + 1];
    if (words[index].startsWith(`${name}=`)) return words[index].slice(name.length + 1);
  }
  return undefined;
}

function agentLogWrite(command: string, cwd: string): MemoryWrite | null {
  const words = shellWords(command);
  const isWriter = words.some((word) => /^agent-log(?:\.(?:js|cjs|py))?$/i.test(basename(word)));
  const file = optionValue(words, "--file");
  const trace = optionValue(words, "--trace");
  const session = optionValue(words, "--session-id");
  const cli = optionValue(words, "--cli");
  const agent = optionValue(words, "--agent");
  const contentFile = optionValue(words, "--content-file");
  const contentArgument = optionValue(words, "--content");
  if (!isWriter || !file || !trace || !session || !cli || !agent || (contentArgument === undefined) === (contentFile === undefined)) return null;
  const content = contentArgument ?? (contentFile ? (() => { try { return readFileSync(expandPath(contentFile, cwd), "utf8"); } catch { return ""; } })() : "");
  const sessionEntry = `\n[session:${cli}:${session.slice(0, 8)}]`;
  return {
    path: expandPath(file, cwd),
    text: `${content}${sessionEntry}${trace ? `\n↪ trace: ${trace}` : ""}`,
    protectedWriter: true,
  };
}

function memoryWrites(events: MemoryTranscriptEvent[], cwd = process.cwd()): MemoryWrite[] {
  return toolCalls(events).flatMap(({ event, call }) => {
    if (event.toolResults.some((result) => result.isError)) return [];
    if (["Edit", "Write"].includes(call.name)) {
      const path = String(call.input.file_path || call.input.filePath || "");
      const text = String(call.input.new_string || call.input.newString || call.input.content || "");
      return path ? [{ path: expandPath(path, cwd), text, protectedWriter: false }] : [];
    }
    if (call.name === "Bash") {
      const command = String(call.input.command || call.input.cmd || "");
      const write = agentLogWrite(command, String(call.input.workdir || call.input.cwd || cwd));
      return write ? [write] : [];
    }
    if (call.name === "agent-log") {
      const path = String(call.input.file || call.input.file_path || "");
      const content = String(call.input.content || "");
      return path ? [{ path: expandPath(path, cwd), text: `${content}\n↪ trace: ${String(call.input.trace || "")}`, protectedWriter: true }] : [];
    }
    return [];
  });
}

function sinceLastSync(events: MemoryTranscriptEvent[], cwd = process.cwd()): Activity {
  let lastSyncIndex = -1;
  events.forEach((event, index) => {
    if (memoryWrites([event], cwd).some(({ path }) => (portablePath(path).includes("/agents/") && portablePath(path).includes("/brain/")) || isActivityPath(path, cwd))) lastSyncIndex = index;
  });
  const eventsSinceSync = lastSyncIndex < 0 ? events : events.slice(lastSyncIndex + 1);
  return { ...scoreActivity(eventsSinceSync), lastSyncIndex, eventsSinceSync };
}

function projectName(cwd: string): string {
  if (!cwd) return "unknown";
  const projectRoot = resolve(dirname(projectMemoryRoot(cwd)));
  return projectRoot === resolve(homedir()) ? "universal" : basename(projectRoot) || basename(cwd) || "unknown";
}

function projectActivityPath(cwd: string): string {
  return join(projectMemoryRoot(cwd), "ACTIVITY.md");
}

function globalActivityPath(): string {
  return join(homedir(), ".agent-memory", "ACTIVITY.md");
}

function isActivityPath(path: string, cwd: string): boolean {
  const absolute = portablePath(resolve(path));
  const projectRoot = resolve(dirname(projectMemoryRoot(cwd)));
  const expected = projectRoot === resolve(homedir()) ? globalActivityPath() : projectActivityPath(cwd);
  return absolute === portablePath(expected);
}

function checkActivityLogged(events: MemoryTranscriptEvent[], cwd: string): boolean {
  return memoryWrites(events, cwd).some(({ path }) => isActivityPath(path, cwd));
}

function trackedFile(path: string, cwd: string): boolean {
  const absolute = portablePath(resolve(path));
  const agentBodyFile = /\/(?:\.agent-memory|\.claude|\.codex|\.opencode|\.agents|\.cursor)\/agents\/[^/]+\//.test(absolute);
  return isActivityPath(absolute, cwd) || agentBodyFile && (absolute.includes("/brain/") || absolute.endsWith("/core/portfolio.md"));
}

function checkSessionIds(events: MemoryTranscriptEvent[], sessionId: string, cwd: string): string[] {
  const shortId = sessionId.slice(0, 8);
  return [...new Set(memoryWrites(events, cwd).flatMap(({ path, text }) => trackedFile(path, cwd) && text && !text.includes(`[session:${shortId}`) && !text.includes(`:${shortId}`) ? [basename(path)] : []))];
}

function checkTraces(events: MemoryTranscriptEvent[], cwd: string): string[] {
  const writes = memoryWrites(events, cwd).filter(({ path, text }) => trackedFile(path, cwd) && Boolean(text));
  return [...new Set(writes.flatMap((item, index) => !item.protectedWriter && item.text.trim().split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).length >= 2 && !/(?:↪\s*)?trace(?:-forward)?:/i.test(item.text) && !writes.slice(index + 1).some((later) => later.path === item.path && /(?:↪\s*)?trace(?:-forward)?:/i.test(later.text)) ? [basename(item.path)] : []))];
}

function checkBidirectional(events: MemoryTranscriptEvent[], cwd: string): Array<{ file: string; oldRef: string; newRef: string }> {
  const backs: Array<{ file: string; target: string; source: string | null }> = [];
  const forwards = new Set<string>();
  const identity = (date: string, agent: string, session: string) => `${date}\0${agent.toLowerCase()}\0${session.slice(0, 8)}`;
  const headerPattern = /^\s*(?:[-*]\s*)?\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gm;
  const backPattern = /↪\s*trace:\s*(?:relates-to|caused-by|continues|same incident as)\s+\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gi;
  const forwardPattern = /↪\s*trace-forward:\s+\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gi;
  for (const { path, text, protectedWriter } of memoryWrites(events, cwd)) {
    if (protectedWriter || !trackedFile(path, cwd) || !text) continue;
    const headers = [...text.matchAll(headerPattern)];
    for (const match of text.matchAll(backPattern)) {
      const sourceHeader = headers.filter((header) => (header.index ?? 0) <= (match.index ?? 0)).at(-1);
      backs.push({ file: path.split(/[\\/]/).at(-1) || path, target: identity(match[1], match[2], match[3]), source: sourceHeader ? identity(sourceHeader[1], sourceHeader[2], sourceHeader[3]) : null });
    }
    for (const match of text.matchAll(forwardPattern)) forwards.add(identity(match[1], match[2], match[3]));
  }
  return backs.flatMap((back) => !back.source || forwards.has(back.source) ? [] : [{ file: back.file, oldRef: back.target.replace(/\0/g, " "), newRef: back.source.replace(/\0/g, " ") }]);
}

function brainStaleness(agent: string, cwd: string): { stale: boolean; hoursSinceLast: number | null } {
  try {
    const match = /\[(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2})?)Z?)?\]/.exec(readFileSync(join(agentBrainDirectory(agent, cwd), "memory.md"), "utf8"));
    if (!match) return { stale: true, hoursSinceLast: null };
    const timestamp = new Date(`${match[1]}T${(match[2] || "00:00")}${match[2]?.length === 5 ? ":00" : ""}Z`);
    if (Number.isNaN(timestamp.valueOf())) return { stale: true, hoursSinceLast: null };
    const hours = (Date.now() - timestamp.getTime()) / 3600000;
    return { stale: hours > 24, hoursSinceLast: Math.round(hours * 10) / 10 };
  } catch { return { stale: true, hoursSinceLast: null }; }
}

function sessionKey(source: string, sessionId: string): string { return createHash("sha256").update(`${source}:${sessionId}`).digest("hex").slice(0, 20); }
function markerPath(source: string, sessionId: string, event: string): string { return join(markerRoot, `${sessionKey(source, sessionId)}-${event}`); }
function hasMarker(source: string, sessionId: string, event: string): boolean { return existsSync(markerPath(source, sessionId, event)); }
function setMarker(source: string, sessionId: string, event: string): void { mkdirSync(markerRoot, { recursive: true }); writeFileSync(markerPath(source, sessionId, event), ""); }

function cleanMarkers(): void {
  try { for (const name of readdirSync(markerRoot)) { const path = join(markerRoot, name); if (Date.now() - statSync(path).mtimeMs > 86400000) unlinkSync(path); } } catch { }
}

function unsyncMarkers(agent: string): UnsyncMarker[] {
  try {
    return readdirSync(unsyncRoot).filter((name) => name.endsWith(`-${agent}.json`)).flatMap((name) => {
      const path = join(unsyncRoot, name);
      try {
        const data = JSON.parse(readFileSync(path, "utf8")) as UnsyncMarker;
        if (Date.now() - Date.parse(data.timestamp) > 72 * 3600000) { unlinkSync(path); return []; }
        return [data];
      } catch { return []; }
    }).sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
  } catch { return []; }
}

function allUnsyncMarkers(): UnsyncMarker[] {
  try {
    return readdirSync(unsyncRoot).filter((name) => name.endsWith(".json")).flatMap((name) => {
      const path = join(unsyncRoot, name);
      try {
        const data = JSON.parse(readFileSync(path, "utf8")) as UnsyncMarker;
        if (Date.now() - Date.parse(data.timestamp) > 72 * 3600000) { unlinkSync(path); return []; }
        return [data];
      } catch { return []; }
    }).sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
  } catch { return []; }
}

function formatUnsync(markers: UnsyncMarker[], timestamp: string): string {
  if (!markers.length) return "";
  const items = markers.slice(0, 3).map((marker, index) => {
    const files = marker.files_changed.slice(0, 5).join(", ") || "none";
    const counts = Object.entries(marker.tool_counts).sort((left, right) => right[1] - left[1]).slice(0, 4).map(([tool, count]) => `${tool}(${count})`).join(", ") || "none";
    const agent = marker.agent === "unknown" ? "not identified" : `@${marker.agent}`;
    return `Session ${index + 1}: [${marker.timestamp}] [session:${marker.session_id.slice(0, 8)}] [${marker.project}]\n  Agent: ${agent}\n  Activity score: ${marker.score.toFixed(1)}\n  Files changed: ${files}\n  Tools used: ${counts}`;
  }).join("\n\n");
  return `\nUNSYNCED PAST SESSIONS\n\nReconcile ${markers.length} prior session(s) in brain/memory.md and add traces to each one:\n\n${items}\n\nUse [${timestamp}] for the new note and include each prior session in its traces.\n`;
}

function timestampNow(): string { return new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); }

function extraBodyFiles(events: MemoryTranscriptEvent[]): Array<[string, string]> {
  let errorSignals = 0;
  let approachSignals = 0;
  for (const event of events) {
    const text = event.text.toLowerCase();
    if (event.role === "assistant") {
      errorSignals += event.toolResults.filter((result) => result.isError).length * 2;
      if (/(mistake|wrong|fix|retry|failed|error)/.test(text)) errorSignals++;
      if (/(approach|strategy|pattern|instead of|better way|refactor)/.test(text)) approachSignals++;
    } else if (event.role === "user" && /(wrong|no that's|not what i|fix|broken|bug)/.test(text)) errorSignals += 2;
  }
  const shipped = toolCalls(events).some(({ call }) => call.name === "Bash" && /git commit|git push|gh pr create/.test(String(call.input.command || "")));
  return [...(errorSignals >= 2 ? [["brain/learnings.md", "Errors or corrections happened — record what went wrong and how it was fixed"] as [string, string]] : []), ...(approachSignals >= 2 ? [["brain/patterns.md", "A reusable approach emerged — document it"] as [string, string]] : []), ...(shipped ? [["core/portfolio.md", "Work shipped — record it in the portfolio"] as [string, string]] : [])];
}

function syncPrompt(eventName: "PreCompact" | "Stop" | "PostToolUse", input: BrainSyncRequest, agent: string | null, project: string, details: string[]): string {
  const label = agent ? agent[0].toUpperCase() + agent.slice(1) : "Agent";
  const brain = agent ? agentBrainDirectory(agent, input.cwd) : "your brain files";
  if (eventName === "PreCompact") {
    const extras = extraBodyFiles(input.events).map(([file, reason]) => `- ${brain.replace(/\/brain$/, "")}/${file}: ${reason}`).join("\n");
    return `BRAIN SYNC REMINDER — Context is about to compress.\n\n@${label}, update your brain files now. This is session [${input.sessionLabel}] in project [${project}].\n\nWrite a specific entry to ${brain}/memory.md with the work completed, decisions and why, and what's next. Add the required ISO timestamp, project, agent, and session metadata. Use trace-search to find a related entry and include a backward trace; the protected writer adds the reciprocal forward trace. Use ↪ trace: none (new topic) only when no related entry exists. Update ${projectActivityPath(input.cwd)} too. If the person told you something that changes how you work with them, add it to ~/.agent-memory/human/ and record it in history.md through the writer.\n${extras ? `\nAlso consider these files:\n${extras}\n` : ""}${details.join("\n")}\nWrite a concise note in your own voice, then continue your work.`;
  }
  if (eventName === "PostToolUse") return `ACTIVITY CHECKPOINT — soft reminder\n\n@${label}, activity since your last note reached a checkpoint. If this phase produced a decision, learning, blocker, meaningful change, or verified result, capture it in brain/memory.md and the relevant ACTIVITY.md with session [${input.sessionLabel}] and a bidirectional trace. This reminder is advisory; continue your work.`;
  return `SESSION END — SYNC CHECK\n\n@${label}, ${details.join("\n\n")}\n\nAdd a concise note with a verified older-entry trace, or ↪ trace: none (new topic) when unrelated. Then continue your work.`;
}

function eventSnapshot(events: MemoryTranscriptEvent[]): string {
  return createHash("sha256").update(JSON.stringify(events)).digest("hex").slice(0, 16);
}

function lastWriteIndex(events: MemoryTranscriptEvent[], predicate: (write: MemoryWrite) => boolean, cwd: string): number {
  let index = -1;
  events.forEach((event, eventIndex) => { if (memoryWrites([event], cwd).some(predicate)) index = eventIndex; });
  return index;
}

function recordUnknownUnsyncedSession(source: string, sessionId: string, cwd: string, events: MemoryTranscriptEvent[], recoveredAfterCrash: boolean): UnsyncMarker | null {
  const activity = sinceLastSync(events, cwd);
  if (activity.totalScore < lightThreshold) return null;
  const path = join(unsyncRoot, `${sessionKey(source, sessionId)}-unknown.json`);
  if (existsSync(path)) return null;
  const marker: UnsyncMarker = {
    session_id: sessionId,
    agent: "unknown",
    source,
    project: projectName(cwd),
    timestamp: timestampNow(),
    score: activity.totalScore,
    files_changed: [...activity.filesChanged],
    tool_counts: activity.toolCounts,
  };
  mkdirSync(unsyncRoot, { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...marker, recovered_after_crash: recoveredAfterCrash }, null, 2)}\n`);
  return marker;
}

export function recoverStaleSessions(graceMs = 2 * 60 * 60 * 1000): UnsyncMarker[] {
  const recovered: UnsyncMarker[] = [];
  const now = Date.now();
  let stateFiles: string[];
  try { stateFiles = readdirSync(sessionRoot).filter((name) => name.endsWith(".state.json")); }
  catch { return recovered; }

  for (const name of stateFiles) {
    const path = join(sessionRoot, name);
    let state: BrainSyncSessionState;
    try { state = JSON.parse(readFileSync(path, "utf8")) as BrainSyncSessionState; }
    catch { continue; }
    if (state.status !== "active" || !Number.isFinite(state.lastSeenAt) || now - state.lastSeenAt < graceMs) continue;

    const events = readBrainSyncEvents(state.source, state.sessionId);
    const agent = detectAgent(events, state.cwd);
    if (agent) {
      const activity = sinceLastSync(events, state.cwd);
      const brainPath = `${portablePath(agentBrainDirectory(agent, state.cwd))}/`;
      const lastBrainIndex = lastWriteIndex(events, ({ path: filePath }) => portablePath(filePath).startsWith(brainPath), state.cwd);
      const lastActivityIndex = lastWriteIndex(events, ({ path: filePath }) => isActivityPath(filePath, state.cwd), state.cwd);
      const brainSynced = lastBrainIndex >= 0 && scoreActivity(events.slice(lastBrainIndex + 1)).totalScore < lightThreshold;
      const activityLogged = lastActivityIndex >= 0 && scoreActivity(events.slice(lastActivityIndex + 1)).totalScore < lightThreshold;
      const markerPath = join(unsyncRoot, `${sessionKey(state.source, state.sessionId)}-${agent}.json`);
      if (activity.totalScore >= lightThreshold && !(brainSynced && activityLogged) && !existsSync(markerPath)) {
        mkdirSync(unsyncRoot, { recursive: true });
        const marker: UnsyncMarker = {
          session_id: state.sessionId,
          agent,
          source: state.source,
          project: projectName(state.cwd),
          timestamp: timestampNow(),
          score: activity.totalScore,
          files_changed: [...activity.filesChanged],
          tool_counts: activity.toolCounts,
        };
        writeFileSync(markerPath, `${JSON.stringify({ ...marker, brain_synced: brainSynced, activity_logged: activityLogged, recovered_after_crash: true }, null, 2)}\n`);
        recovered.push(marker);
      }
    } else {
      const marker = recordUnknownUnsyncedSession(state.source, state.sessionId, state.cwd, events, true);
      if (marker) recovered.push(marker);
    }

    state.status = "recovered";
    state.recoveredAt = now;
    writeSessionState(path, state);
  }
  return recovered;
}

export function pendingUnsyncedSessions(): UnsyncMarker[] {
  return allUnsyncMarkers();
}

export function runBrainSync(eventName: string, input: BrainSyncRequest): string | null {
  const sessionId = input.sessionId || "unknown";
  const project = projectName(input.cwd);
  const events = input.events;
  if (eventName === "SessionStart") {
    const past = allUnsyncMarkers();
    const marker = `session-start-${createHash("sha256").update(JSON.stringify(past.map(({ source, session_id, timestamp }) => [source, session_id, timestamp]))).digest("hex").slice(0, 16)}`;
    if (hasMarker(input.source, sessionId, marker)) return null;
    setMarker(input.source, sessionId, marker);
    return past.length ? `UNSYNCED SESSION CATCH-UP\n\n${formatUnsync(past, timestampNow())}\nReconcile these notes before starting unrelated work.` : null;
  }
  if (eventName === "PreCompact") {
    const marker = `pre-compact-${eventSnapshot(events)}`;
    if (!events.length || hasMarker(input.source, sessionId, marker)) return null;
    const agent = detectAgent(events, input.cwd);
    const activity = sinceLastSync(events, input.cwd);
    const missingSessions = checkSessionIds(events, sessionId, input.cwd);
    const missingTraces = checkTraces(events, input.cwd);
    const missingLinks = checkBidirectional(events, input.cwd);
    if (activity.totalScore < 1 && !missingSessions.length && !missingTraces.length && !missingLinks.length) return null;
    setMarker(input.source, sessionId, marker);
    const details = [
      ...(missingSessions.length ? [`Missing session tags in: ${missingSessions.join(", ")}. Fix them.`] : []),
      ...(missingTraces.length ? [`Missing traces in: ${missingTraces.join(", ")}. Fix them.`] : []),
      ...(missingLinks.length ? [`Missing reciprocal links: ${missingLinks.map((item) => `${item.file}: ${item.oldRef} → ${item.newRef}`).join("; ")}. Retry protected-log writes through agent-log.`] : []),
    ];
    return syncPrompt("PreCompact", input, agent, project, details);
  }

  if (eventName === "Stop") {
    const marker = `stop-${eventSnapshot(events)}`;
    if (!events.length || hasMarker(input.source, sessionId, marker)) return null;
    const agent = detectAgent(events, input.cwd);
    if (!agent) return null;
    const brainPath = `${portablePath(agentBrainDirectory(agent, input.cwd))}/`;
    const lastBrainIndex = lastWriteIndex(events, ({ path }) => portablePath(path).startsWith(brainPath), input.cwd);
    const lastActivityIndex = lastWriteIndex(events, ({ path }) => isActivityPath(path, input.cwd), input.cwd);
    const activitySinceBrain = scoreActivity(events.slice(lastBrainIndex + 1));
    const activitySinceActivity = scoreActivity(events.slice(lastActivityIndex + 1));
    const brainSynced = lastBrainIndex >= 0;
    const activityLogged = checkActivityLogged(events, input.cwd);
    const stale = brainStaleness(agent, input.cwd);
    const past = unsyncMarkers(agent);
    const needBrain = activitySinceBrain.totalScore >= lightThreshold || stale.stale || past.length > 0;
    const needActivity = activitySinceActivity.totalScore >= lightThreshold;
    const missingSessions = checkSessionIds(events, sessionId, input.cwd);
    const missingTraces = checkTraces(events, input.cwd);
    const missingLinks = checkBidirectional(events, input.cwd);
    if (!needBrain && !needActivity && !missingSessions.length && !missingTraces.length && !missingLinks.length) {
      setMarker(input.source, sessionId, marker);
      if (brainSynced && activityLogged) for (const marker of past) { try { unlinkSync(join(unsyncRoot, `${sessionKey(marker.source, marker.session_id)}-${agent}.json`)); } catch { } }
      return null;
    }
    const details = [formatUnsync(past, timestampNow())].filter(Boolean);
    if (needBrain) {
      const score = activitySinceBrain.totalScore;
      const severity = score >= heavyThreshold ? "HEAVY" : "MODERATE";
      details.push(`${severity} session activity (${score.toFixed(1)}); ${stale.stale ? `last entry ${stale.hoursSinceLast ?? "unknown"} hours ago` : "recent notes are fresh"}. Reconcile ${join(agentBrainDirectory(agent, input.cwd), "memory.md")} for session [${input.sessionLabel}] in [${project}].`);
    }
    if (needActivity) details.push(`The project ACTIVITY.md was not updated for [${project}]. Record this session with [session:${input.sessionLabel}].`);
    if (missingSessions.length) details.push(`Missing session tags in: ${missingSessions.join(", ")}.`);
    if (missingTraces.length) details.push(`Missing traces in: ${missingTraces.join(", ")}. Use trace-search, then write through agent-log so reciprocal traces are preserved.`);
    if (missingLinks.length) details.push(`Missing reciprocal links: ${missingLinks.map((item) => `${item.file}: ${item.oldRef} → ${item.newRef}`).join("; ")}. Retry protected-log writes through agent-log.`);
    setMarker(input.source, sessionId, marker);
    cleanMarkers();
    return syncPrompt("Stop", input, agent, project, details);
  }

  if (eventName === "SessionEnd") {
    if (!events.length) return null;
    const eventMarker = `session-end-${eventSnapshot(events)}`;
    if (hasMarker(input.source, sessionId, eventMarker)) return null;
    setMarker(input.source, sessionId, eventMarker);
    const agent = detectAgent(events, input.cwd);
    if (!agent) {
      recordUnknownUnsyncedSession(input.source, sessionId, input.cwd, events, false);
      return null;
    }
    const activity = sinceLastSync(events, input.cwd);
    const brainPath = `${portablePath(agentBrainDirectory(agent, input.cwd))}/`;
    const lastBrainIndex = lastWriteIndex(events, ({ path }) => portablePath(path).startsWith(brainPath), input.cwd);
    const lastActivityIndex = lastWriteIndex(events, ({ path }) => isActivityPath(path, input.cwd), input.cwd);
    const brainSynced = lastBrainIndex >= 0 && scoreActivity(events.slice(lastBrainIndex + 1)).totalScore < lightThreshold;
    const activityLogged = lastActivityIndex >= 0 && scoreActivity(events.slice(lastActivityIndex + 1)).totalScore < lightThreshold;
    const unsyncPath = join(unsyncRoot, `${sessionKey(input.source, sessionId)}-${agent}.json`);
    if (brainSynced && activityLogged) {
      try { unlinkSync(unsyncPath); } catch { }
      return null;
    }
    if (activity.totalScore < lightThreshold) return null;
    mkdirSync(unsyncRoot, { recursive: true });
    const unsync: UnsyncMarker = { session_id: sessionId, agent, source: input.source, project, score: activity.totalScore, files_changed: [...activity.filesChanged], tool_counts: activity.toolCounts, timestamp: timestampNow() };
    writeFileSync(unsyncPath, `${JSON.stringify({ ...unsync, brain_synced: brainSynced, activity_logged: activityLogged, user_messages: activity.userMessageCount }, null, 2)}\n`);
    return null;
  }

  if (eventName === "PostToolUse") {
    const agent = detectAgent(events, input.cwd);
    if (!agent) return null;
    const activity = sinceLastSync(events, input.cwd);
    if (activity.totalScore < lightThreshold) return null;
    const signals = [...new Set(activity.eventsSinceSync.flatMap((event) => event.toolCalls.map((call) => call.name === "Task" ? "subagent milestone" : ["WebFetch", "WebSearch"].includes(call.name) ? "research activity" : call.name === "Bash" ? "terminal activity" : ["Edit", "Write", "apply_patch"].includes(call.name) ? "meaningful file change" : "").filter(Boolean)))];
    if (!signals.length) return null;
    const bucket = Math.floor(activity.totalScore / lightThreshold);
    const marker = `checkpoint-${activity.lastSyncIndex}-${bucket}`;
    if (hasMarker(input.source, sessionId, marker)) return null;
    setMarker(input.source, sessionId, marker);
    const label = agent[0].toUpperCase() + agent.slice(1);
    return `ACTIVITY CHECKPOINT — soft reminder\n\n@${label}, activity since your last note sync crossed a checkpoint (${activity.totalScore.toFixed(1)}; ${signals.join(", ")}). If this phase produced an important decision, learning, blocker, meaningful change, or verified result, capture it in brain/memory.md and the relevant ACTIVITY.md with session [${input.sessionLabel}] and a bidirectional trace. This reminder is advisory; continue your work.`;
  }
  return null;
}
