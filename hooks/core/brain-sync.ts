import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { STATE_DIR } from "../../common";

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
  transcriptSize: number;
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

const agentsRoot = join(homedir(), ".agent-memory", "agents");
const markerRoot = join(STATE_DIR, "brain-sync", "markers");
const unsyncRoot = join(STATE_DIR, "brain-sync", "unsynced");
const heavyThreshold = 15;
const lightThreshold = 9;
const contextThreshold = 12 * 1024 * 1024;
const checkpointTools = new Set(["Edit", "Write", "Bash", "Task", "WebFetch", "WebSearch", "apply_patch"]);
const toolWeights: Record<string, number> = { Edit: 3, Write: 3, Bash: 1.5, Task: 2, Read: 0.5, Glob: 0.25, Grep: 0.25, TodoWrite: 0, WebFetch: 1, WebSearch: 1 };

function discoverAgents(): string[] {
  try { return readdirSync(agentsRoot).filter((name) => existsSync(join(agentsRoot, name, "soul.md"))); }
  catch { return []; }
}

function toolCalls(events: MemoryTranscriptEvent[]): Array<{ event: MemoryTranscriptEvent; call: MemoryToolCall }> {
  return events.flatMap((event) => event.role === "assistant" ? event.toolCalls.map((call) => ({ event, call })) : []);
}

function detectAgent(events: MemoryTranscriptEvent[]): string | null {
  const agents = discoverAgents();
  const scores = new Map<string, number>();
  for (const { call } of toolCalls(events)) {
    const path = String(call.input.file_path || "");
    if (!path.includes("/agents/")) continue;
    for (const agent of agents) if (path.includes(`/agents/${agent}/`)) scores.set(agent, (scores.get(agent) || 0) + ((path.includes("/brain/") ? 3 : 1) * (["Edit", "Write"].includes(call.name) ? 2 : 1)));
  }
  if (!scores.size) for (const event of events) {
    if (event.role !== "user") continue;
    for (const agent of agents) if (new RegExp(`\\bhey\\s+${agent}\\b`, "i").test(event.text)) scores.set(agent, (scores.get(agent) || 0) + 10);
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

function sinceLastSync(events: MemoryTranscriptEvent[]): Activity {
  let lastSyncIndex = -1;
  events.forEach((event, index) => {
    if (event.toolCalls.some((call) => ["Edit", "Write"].includes(call.name) && (String(call.input.file_path || "").includes("/brain/") || String(call.input.file_path || "").includes("ACTIVITY.md")))) lastSyncIndex = index;
  });
  const eventsSinceSync = lastSyncIndex < 0 ? events : events.slice(lastSyncIndex + 1);
  return { ...scoreActivity(eventsSinceSync), lastSyncIndex, eventsSinceSync };
}

function projectName(cwd: string): string { return cwd ? cwd.split(/[\\/]/).filter(Boolean).at(-1) || "unknown" : "unknown"; }

function checkBrainModified(agent: string, events: MemoryTranscriptEvent[]): boolean {
  const prefix = join(agentsRoot, agent, "brain");
  return toolCalls(events).some(({ call }) => ["Edit", "Write"].includes(call.name) && String(call.input.file_path || "").startsWith(prefix));
}

function checkActivityLogged(events: MemoryTranscriptEvent[], cwd: string): boolean {
  const expected = resolve(cwd);
  const globalActivity = join(homedir(), ".agent-memory", "comms", "ACTIVITY.md");
  return toolCalls(events).some(({ call }) => {
    const path = String(call.input.file_path || "");
    if (!path.endsWith("ACTIVITY.md") || !["Edit", "Write"].includes(call.name)) return false;
    const absolute = resolve(isAbsolute(path) ? path : join(cwd, path));
    return absolute.startsWith(expected) || absolute === globalActivity;
  });
}

function trackedFile(path: string): boolean {
  return path.endsWith(".md") && (path.includes("/.agent-memory/") || (path.includes("/agents/") && path.includes(".agent-memory")));
}

function checkSessionIds(events: MemoryTranscriptEvent[], sessionId: string): string[] {
  const shortId = sessionId.slice(0, 8);
  return [...new Set(toolCalls(events).flatMap(({ call }) => {
    const path = String(call.input.file_path || "");
    const text = String(call.input.new_string || call.input.content || "");
    return ["Edit", "Write"].includes(call.name) && trackedFile(path) && text && !text.includes(`[session:${shortId}]`) && !text.includes("[session:") ? [path.split(/[\\/]/).at(-1)!] : [];
  }))];
}

function checkTraces(events: MemoryTranscriptEvent[]): string[] {
  const writes = toolCalls(events).flatMap(({ call }) => {
    const path = String(call.input.file_path || "");
    const text = String(call.input.new_string || call.input.content || "");
    if (!["Edit", "Write"].includes(call.name) || !trackedFile(path) || !text) return [];
    const substantive = text.trim().split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).length >= 2;
    return [{ path, text, substantive }];
  });
  return [...new Set(writes.flatMap((item, index) => item.substantive && !/(?:↪\s*)?trace(?:-forward)?:/i.test(item.text) && !writes.slice(index + 1).some((later) => later.path === item.path && /(?:↪\s*)?trace(?:-forward)?:/i.test(later.text)) ? [item.path.split(/[\\/]/).at(-1)!] : []))];
}

function checkBidirectional(events: MemoryTranscriptEvent[]): Array<{ file: string; oldRef: string; newRef: string }> {
  const backs: Array<{ file: string; target: string; source: string | null }> = [];
  const forwards = new Set<string>();
  const identity = (date: string, agent: string, session: string) => `${date}\0${agent.toLowerCase()}\0${session.slice(0, 8)}`;
  const headerPattern = /^\s*(?:[-*]\s*)?\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gm;
  const backPattern = /↪\s*trace:\s*(?:relates-to|caused-by|continues|same incident as)\s+\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gi;
  const forwardPattern = /↪\s*trace-forward:\s+\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gi;
  for (const { call } of toolCalls(events)) {
    const path = String(call.input.file_path || "");
    const text = String(call.input.new_string || call.input.content || "");
    if (!["Edit", "Write"].includes(call.name) || !trackedFile(path) || !text) continue;
    const headers = [...text.matchAll(headerPattern)];
    for (const match of text.matchAll(backPattern)) {
      const sourceHeader = headers.filter((header) => (header.index ?? 0) <= (match.index ?? 0)).at(-1);
      backs.push({ file: path.split(/[\\/]/).at(-1) || path, target: identity(match[1], match[2], match[3]), source: sourceHeader ? identity(sourceHeader[1], sourceHeader[2], sourceHeader[3]) : null });
    }
    for (const match of text.matchAll(forwardPattern)) forwards.add(identity(match[1], match[2], match[3]));
  }
  return backs.flatMap((back) => !back.source || forwards.has(back.source) ? [] : [{ file: back.file, oldRef: back.target.replace(/\0/g, " "), newRef: back.source.replace(/\0/g, " ") }]);
}

function brainStaleness(agent: string): { stale: boolean; hoursSinceLast: number | null } {
  try {
    const match = /\[(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2})?)Z?)?\]/.exec(readFileSync(join(agentsRoot, agent, "brain", "memory.md"), "utf8"));
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

function formatUnsync(markers: UnsyncMarker[], timestamp: string): string {
  if (!markers.length) return "";
  const items = markers.slice(0, 3).map((marker, index) => {
    const files = marker.files_changed.slice(0, 5).join(", ") || "none";
    const counts = Object.entries(marker.tool_counts).sort((left, right) => right[1] - left[1]).slice(0, 4).map(([tool, count]) => `${tool}(${count})`).join(", ") || "none";
    return `Session ${index + 1}: [${marker.timestamp}] [session:${marker.session_id.slice(0, 8)}] [${marker.project}]\n  Activity score: ${marker.score.toFixed(1)}\n  Files changed: ${files}\n  Tools used: ${counts}`;
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
  const brain = agent ? `~/.agent-memory/agents/${agent}/brain` : "your brain files";
  if (eventName === "PreCompact") {
    const extras = extraBodyFiles(input.events).map(([file, reason]) => `- ${brain.replace(/\/brain$/, "")}/${file}: ${reason}`).join("\n");
    return `BRAIN SYNC REMINDER — Context is about to compress.\n\n@${label}, update your brain files now. This is session [${input.sessionLabel}] in project [${project}].\n\nWrite a specific entry to ${brain}/memory.md with the work completed, decisions and why, and what's next. Add the required ISO timestamp, project, agent, and session metadata. Use trace-search to find a related entry and include a backward trace; the protected writer adds the reciprocal forward trace. Use ↪ trace: none (new topic) only when no related entry exists. Update the relevant .agent-memory/comms/ACTIVITY.md too.\n${extras ? `\nAlso consider these files:\n${extras}\n` : ""}${details.join("\n")}\nWrite a concise note in your own voice, then continue your work.`;
  }
  if (eventName === "PostToolUse") return `CONTEXT MONITOR — transcript is about ${Math.round(input.transcriptSize / 1024 / 1024)} MB.\n\n@${label}, write durable notes to your brain/memory.md and the relevant ACTIVITY.md now, with an ISO timestamp, project, session [${input.sessionLabel}], and a verified bidirectional trace. Then continue your work.`;
  return `SESSION END — SYNC CHECK\n\n@${label}, ${details.join("\n\n")}\n\nAdd a concise note with a verified older-entry trace, or ↪ trace: none (new topic) when unrelated. Then continue your work.`;
}

export function runBrainSync(eventName: string, input: BrainSyncRequest): string | null {
  const sessionId = input.sessionId || "unknown";
  const project = projectName(input.cwd);
  const events = input.events;
  if (eventName === "PreCompact") {
    if (hasMarker(input.source, sessionId, "pre-compact") || !events.length) return null;
    const agent = detectAgent(events);
    const missingSessions = checkSessionIds(events, sessionId);
    const missingTraces = checkTraces(events);
    const missingLinks = checkBidirectional(events);
    if (agent && checkBrainModified(agent, events) && !missingSessions.length && !missingTraces.length && !missingLinks.length) { setMarker(input.source, sessionId, "pre-compact"); return null; }
    setMarker(input.source, sessionId, "pre-compact");
    const details = [
      ...(missingSessions.length ? [`Missing session tags in: ${missingSessions.join(", ")}. Fix them.`] : []),
      ...(missingTraces.length ? [`Missing traces in: ${missingTraces.join(", ")}. Fix them.`] : []),
      ...(missingLinks.length ? [`Missing reciprocal links: ${missingLinks.map((item) => `${item.file}: ${item.oldRef} → ${item.newRef}`).join("; ")}. Retry protected-log writes through agent-log.`] : []),
    ];
    return syncPrompt("PreCompact", input, agent, project, details);
  }

  if (eventName === "Stop") {
    if (hasMarker(input.source, sessionId, "stop")) return null;
    if (!events.length) { setMarker(input.source, sessionId, "stop"); return null; }
    const agent = detectAgent(events);
    if (!agent) { setMarker(input.source, sessionId, "stop"); return null; }
    const activity = sinceLastSync(events);
    const brainSynced = checkBrainModified(agent, events);
    const activityLogged = checkActivityLogged(events, input.cwd);
    const stale = brainStaleness(agent);
    const past = unsyncMarkers(agent);
    const needBrain = !brainSynced && (activity.totalScore >= lightThreshold || stale.stale || past.length > 0);
    const needActivity = !activityLogged && activity.totalScore >= lightThreshold;
    const missingSessions = activity.totalScore >= lightThreshold ? checkSessionIds(events, sessionId) : [];
    const missingTraces = activity.totalScore >= lightThreshold ? checkTraces(events) : [];
    const missingLinks = activity.totalScore >= lightThreshold ? checkBidirectional(events) : [];
    if (!needBrain && !needActivity && !missingSessions.length && !missingTraces.length && !missingLinks.length) {
      setMarker(input.source, sessionId, "stop");
      if (brainSynced) for (const marker of past) { try { unlinkSync(join(unsyncRoot, `${sessionKey(marker.source, marker.session_id)}-${agent}.json`)); } catch { } }
      return null;
    }
    const details = [formatUnsync(past, timestampNow())].filter(Boolean);
    if (needBrain) {
      const severity = activity.totalScore >= heavyThreshold ? "HEAVY" : "MODERATE";
      details.push(`${severity} session activity (${activity.totalScore.toFixed(1)}); ${stale.stale ? `last entry ${stale.hoursSinceLast ?? "unknown"} hours ago` : "recent notes are fresh"}. Reconcile ~/.agent-memory/agents/${agent}/brain/memory.md for session [${input.sessionLabel}] in [${project}].`);
    }
    if (needActivity) details.push(`The project ACTIVITY.md was not updated for [${project}]. Record this session with [session:${input.sessionLabel}].`);
    if (missingSessions.length) details.push(`Missing session tags in: ${missingSessions.join(", ")}.`);
    if (missingTraces.length) details.push(`Missing traces in: ${missingTraces.join(", ")}. Use trace-search, then write through agent-log so reciprocal traces are preserved.`);
    if (missingLinks.length) details.push(`Missing reciprocal links: ${missingLinks.map((item) => `${item.file}: ${item.oldRef} → ${item.newRef}`).join("; ")}. Retry protected-log writes through agent-log.`);
    setMarker(input.source, sessionId, "stop");
    cleanMarkers();
    return syncPrompt("Stop", input, agent, project, details);
  }

  if (eventName === "SessionEnd") {
    if (hasMarker(input.source, sessionId, "session-end")) return null;
    setMarker(input.source, sessionId, "session-end");
    if (!events.length) return null;
    const agent = detectAgent(events);
    if (!agent) return null;
    const activity = sinceLastSync(events);
    const brainSynced = checkBrainModified(agent, events);
    const activityLogged = checkActivityLogged(events, input.cwd);
    if (brainSynced && activityLogged || activity.totalScore < lightThreshold) return null;
    mkdirSync(unsyncRoot, { recursive: true });
    const marker: UnsyncMarker = { session_id: sessionId, agent, source: input.source, project, score: activity.totalScore, files_changed: [...activity.filesChanged], tool_counts: activity.toolCounts, timestamp: timestampNow() };
    writeFileSync(join(unsyncRoot, `${sessionKey(input.source, sessionId)}-${agent}.json`), `${JSON.stringify({ ...marker, brain_synced: brainSynced, activity_logged: activityLogged, user_messages: activity.userMessageCount }, null, 2)}\n`);
    return null;
  }

  if (eventName === "PostToolUse") {
    if (hasMarker(input.source, sessionId, "context-monitor")) return null;
    const agent = detectAgent(events);
    if (input.transcriptSize < contextThreshold) {
      if (!checkpointTools.has(input.toolName || "") || !agent) return null;
      const activity = sinceLastSync(events);
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
    setMarker(input.source, sessionId, "context-monitor");
    if (agent && checkBrainModified(agent, events) && !checkSessionIds(events, sessionId).length && !checkTraces(events).length && !checkBidirectional(events).length) return null;
    return syncPrompt("PostToolUse", input, agent, project, []);
  }
  return null;
}
