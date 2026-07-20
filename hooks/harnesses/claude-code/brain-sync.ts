#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

type Dict = Record<string, any>;
type Event = Dict;

const memoryRoot = join(homedir(), ".agent-memory");
const agentsRoot = join(memoryRoot, "agents");
const markerRoot = join(tmpdir(), "claude-brain-sync");
const unsyncRoot = join(tmpdir(), "claude-brain-unsync");
const sessionCache = join(tmpdir(), "claude-session-id");
const heavyThreshold = 15;
const lightThreshold = 9;
const contextThreshold = 12 * 1024 * 1024;
const checkpointTools = new Set(["Edit", "Write", "Bash", "Task", "WebFetch", "WebSearch", "apply_patch"]);
const toolWeights: Record<string, number> = { Edit: 3, Write: 3, Bash: 1.5, Task: 2, Read: 0.5, Glob: 0.25, Grep: 0.25, TodoWrite: 0, WebFetch: 1, WebSearch: 1 };

function discoverAgents(): string[] {
  try { return readdirSync(agentsRoot).filter((name) => existsSync(join(agentsRoot, name, "soul.md"))); }
  catch { return []; }
}

function readTranscript(path: string): Event[] {
  try {
    const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).slice(-2000);
    return lines.flatMap((line) => { try { return [JSON.parse(line) as Event]; } catch { return []; } });
  } catch { return []; }
}

function message(event: Event): Dict { return event.message && typeof event.message === "object" ? event.message : {}; }
function blocks(event: Event): Dict[] { const value = message(event).content; return Array.isArray(value) ? value.filter((part: unknown) => part && typeof part === "object") : []; }
function toolUses(events: Event[]): Array<{ event: Event; block: Dict; input: Dict }> {
  return events.flatMap((event) => message(event).role === "assistant" ? blocks(event).filter((block) => block.type === "tool_use").map((block) => ({ event, block, input: block.input && typeof block.input === "object" ? block.input : {} })) : []);
}

function extractText(msg: Dict): string {
  const content = msg.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((block: any) => typeof block === "string" ? block : block?.type === "text" ? block.text || "" : "").join("\n");
  return "";
}

function detectAgent(events: Event[]): string | null {
  const agents = discoverAgents();
  const scores = new Map<string, number>();
  for (const { block, input } of toolUses(events)) {
    const path = String(input.file_path || "");
    if (!path.includes("/agents/")) continue;
    for (const agent of agents) if (path.includes(`/agents/${agent}/`)) scores.set(agent, (scores.get(agent) || 0) + ((path.includes("/brain/") ? 3 : 1) * (["Edit", "Write"].includes(block.name) ? 2 : 1)));
  }
  if (!scores.size) for (const event of events) {
    const msg = message(event);
    if (msg.role !== "user") continue;
    const text = extractText(msg);
    for (const agent of agents) if (new RegExp(`\\bhey\\s+${agent}\\b`, "i").test(text)) scores.set(agent, (scores.get(agent) || 0) + 10);
  }
  return [...scores].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function scoreActivity(events: Event[]): Dict {
  const counts: Record<string, number> = {};
  const files = new Set<string>();
  let userMessages = 0;
  for (const event of events) {
    const msg = message(event);
    if (msg.role === "user" || event.type === "user") {
      if (Array.isArray(msg.content) && msg.content.some((part: Dict) => part?.type === "tool_result")) continue;
      const text = extractText(msg);
      if (text.length > 10 && !text.startsWith("<system")) userMessages++;
    }
    if (msg.role !== "assistant") continue;
    for (const block of blocks(event).filter((part) => part.type === "tool_use")) {
      counts[block.name] = (counts[block.name] || 0) + 1;
      const path = block.input?.file_path;
      if (path && ["Edit", "Write"].includes(block.name)) files.add(String(path).split("/").slice(-2).join("/"));
    }
  }
  const total = Object.entries(counts).reduce((sum, [name, count]) => sum + count * (toolWeights[name] ?? 1), 0) + userMessages * 1.5;
  return { total_score: total, tool_counts: counts, files_changed: files, user_message_count: userMessages };
}

function sinceLastSync(events: Event[]): Dict {
  let lastSyncIndex = -1;
  events.forEach((event, index) => {
    if (toolUses([event]).some(({ block, input }) => ["Edit", "Write"].includes(block.name) && (String(input.file_path || "").includes("/brain/") || String(input.file_path || "").includes("ACTIVITY.md")))) lastSyncIndex = index;
  });
  const tail = lastSyncIndex < 0 ? events : events.slice(lastSyncIndex + 1);
  return { ...scoreActivity(tail), last_sync_index: lastSyncIndex, events_since_sync: tail };
}

function detectProject(cwd: string): string { return cwd ? cwd.split(/[\\/]/).filter(Boolean).at(-1) || "unknown" : "unknown"; }
function notePath(path: string): boolean { return path.includes("/brain/") || path.endsWith("/ACTIVITY.md"); }

function checkBrainModified(agent: string, events: Event[]): boolean {
  const prefix = join(agentsRoot, agent, "brain");
  return toolUses(events).some(({ block, input }) => ["Edit", "Write"].includes(block.name) && String(input.file_path || "").startsWith(prefix));
}

function checkActivityLogged(events: Event[], cwd: string): boolean {
  const expected = resolve(cwd);
  const globalActivity = join(homedir(), ".agent-memory", "comms", "ACTIVITY.md");
  return toolUses(events).some(({ block, input }) => {
    const path = String(input.file_path || "");
    if (!path.endsWith("ACTIVITY.md") || !["Edit", "Write"].includes(block.name)) return false;
    const absolute = resolve(path);
    return absolute.startsWith(expected) || absolute === globalActivity;
  });
}

function trackedFile(path: string): boolean {
  if (!path.endsWith(".md")) return false;
  if (path.includes("/.agent-memory/")) return true;
  return path.includes("/agents/") && path.includes(".agent-memory");
}

function checkSessionIds(events: Event[], sessionId: string): string[] {
  const sid = sessionId.slice(0, 8);
  return [...new Set(toolUses(events).flatMap(({ block, input }) => {
    const path = String(input.file_path || "");
    const text = String(input.new_string || input.content || "");
    return ["Edit", "Write"].includes(block.name) && trackedFile(path) && text && !text.includes(`[session:${sid}]`) && !text.includes("[session:") ? [path.split("/").at(-1)!] : [];
  }))];
}

function checkTraces(events: Event[]): string[] {
  const writes = toolUses(events).flatMap(({ block, input }) => {
    const path = String(input.file_path || "");
    const text = String(input.new_string || input.content || "");
    if (!["Edit", "Write"].includes(block.name) || !trackedFile(path) || !text) return [];
    const substantive = text.trim().split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).length >= 2;
    return [{ path, text, substantive }];
  });
  return [...new Set(writes.flatMap((item, index) => item.substantive && !/(?:↪\s*)?trace(?:-forward)?:/i.test(item.text) && !writes.slice(index + 1).some((later) => later.path === item.path && /(?:↪\s*)?trace(?:-forward)?:/i.test(later.text)) ? [item.path.split("/").at(-1)!] : []))];
}

function checkBidirectional(events: Event[]): Array<{ file: string; old_ref: string; new_ref: string }> {
  const backs: Array<{ file: string; target: string; source: string | null }> = [];
  const forwards = new Set<string>();
  const identity = (date: string, agent: string, session: string) => `${date}\0${agent.toLowerCase()}\0${session.slice(0, 8)}`;
  const headerPattern = /^\s*(?:[-*]\s*)?\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gm;
  const backPattern = /↪\s*trace:\s*(?:relates-to|caused-by|continues|same incident as)\s+\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gi;
  const forwardPattern = /↪\s*trace-forward:\s+\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)\].*?@(\w+).*?\[session:([^\]]+)\]/gi;
  for (const { block, input } of toolUses(events)) {
    const path = String(input.file_path || "");
    const text = String(input.new_string || input.content || "");
    if (!["Edit", "Write"].includes(block.name) || !trackedFile(path) || !text) continue;
    const headers = [...text.matchAll(headerPattern)];
    for (const match of text.matchAll(backPattern)) {
      const sourceHeader = headers.filter((header) => (header.index ?? 0) <= (match.index ?? 0)).at(-1);
      backs.push({ file: path.split("/").at(-1) || path, target: identity(match[1], match[2], match[3]), source: sourceHeader ? identity(sourceHeader[1], sourceHeader[2], sourceHeader[3]) : null });
    }
    for (const match of text.matchAll(forwardPattern)) forwards.add(identity(match[1], match[2], match[3]));
  }
  return backs.flatMap((back) => !back.source || forwards.has(back.source) ? [] : [{ file: back.file, old_ref: back.target.replace(/\0/g, " "), new_ref: back.source.replace(/\0/g, " ") }]);
}

function checkBrainStaleness(agent: string): Dict {
  try {
    const match = /\[(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2})?)Z?)?\]/.exec(readFileSync(join(agentsRoot, agent, "brain", "memory.md"), "utf8"));
    if (!match) return { is_stale: true, hours_since_last: null };
    const timestamp = new Date(`${match[1]}T${(match[2] || "00:00")}${match[2]?.length === 5 ? ":00" : ""}Z`);
    const hours = (Date.now() - timestamp.getTime()) / 3600000;
    return { is_stale: hours > 24, hours_since_last: Math.round(hours * 10) / 10 };
  } catch { return { is_stale: true, hours_since_last: null }; }
}

function markerPath(session: string, event: string): string { return join(markerRoot, `${session.slice(0, 8)}-${event}`); }
function hasMarker(session: string, event: string): boolean { return existsSync(markerPath(session, event)); }
function setMarker(session: string, event: string): void { mkdirSync(markerRoot, { recursive: true }); writeFileSync(markerPath(session, event), ""); }
function cleanMarkers(): void {
  try { for (const name of readdirSync(markerRoot)) { const path = join(markerRoot, name); if (Date.now() - statSync(path).mtimeMs > 86400000) unlinkSync(path); } } catch { }
}

function unsyncMarkers(agent: string): Dict[] {
  try {
    return readdirSync(unsyncRoot).filter((name) => name.endsWith(`-${agent}.json`)).flatMap((name) => {
      const path = join(unsyncRoot, name);
      try { const data = JSON.parse(readFileSync(path, "utf8")); if (Date.now() - Date.parse(data.timestamp) > 72 * 3600000) { unlinkSync(path); return []; } return [data]; }
      catch { return []; }
    }).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  } catch { return []; }
}

function formatUnsync(markers: Dict[], timestamp: string): string {
  if (!markers.length) return "";
  const items = markers.slice(0, 3).map((marker, index) => {
    const files = Array.isArray(marker.files_changed) ? marker.files_changed.slice(0, 5).join(", ") : "none";
    const counts = marker.tool_counts && typeof marker.tool_counts === "object" ? Object.entries(marker.tool_counts).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 4).map(([tool, count]) => `${tool}(${count})`).join(", ") : "";
    return `Session ${index + 1}: [${marker.timestamp || "unknown"}] [session:${String(marker.session_id || "unknown").slice(0, 8)}] [${marker.project || "unknown"}]\n  Activity score: ${Number(marker.score || 0).toFixed(1)}\n  Files changed: ${files}\n  Tools used: ${counts || "none"}`;
  }).join("\n\n");
  return `\nUNSYNCED PAST SESSIONS\n\nReconcile ${markers.length} prior session(s) in brain/memory.md and add traces to each one:\n\n${items}\n\nUse [${timestamp}] for the new note and include each prior session in its traces.\n`;
}

function sessionLabel(sessionId: string): string {
  if (sessionId && sessionId !== "unknown") return `${process.env.COMPUTERNAME?.toLowerCase().startsWith("desktop") ? "omen" : "mac"}:${sessionId.slice(0, 8)}`;
  try {
    const raw = readFileSync(sessionCache, "utf8").trim();
    const cached = raw.startsWith("{") ? JSON.parse(raw) : null;
    return cached?.short_session || raw || "unknown";
  } catch { return "unknown"; }
}

function currentTimestamp(): string { return new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); }
function extraBodyFiles(events: Event[]): Array<[string, string]> {
  const allText = events.map((event) => extractText(message(event))).join(" ").toLowerCase();
  const error = /mistake|wrong|fix|retry|failed|error|broken|bug/.test(allText);
  const approach = /approach|strategy|pattern|instead of|better way|refactor/.test(allText);
  const shipped = toolUses(events).some(({ block, input }) => block.name === "Bash" && /git commit|git push|gh pr create/.test(String(input.command || "")));
  return [...(error ? [["brain/learnings.md", "Errors or corrections happened — record what went wrong and how it was fixed"] as [string, string]] : []), ...(approach ? [["brain/patterns.md", "A reusable approach emerged — document the pattern"] as [string, string]] : []), ...(shipped ? [["core/portfolio.md", "Work shipped — record it in the portfolio"] as [string, string]] : [])];
}

function emit(prompt: string): void { process.stdout.write(`${JSON.stringify({ continue: true, additionalContext: prompt })}\n`); }

function handlePreCompact(input: Dict): void {
  const session = String(input.session_id || "unknown");
  const path = String(input.transcript_path || "");
  if (hasMarker(session, "pre-compact") || !path || !existsSync(path)) return;
  const events = readTranscript(path);
  if (!events.length) return;
  const agent = detectAgent(events);
  const project = detectProject(String(input.cwd || ""));
  const missingSessions = checkSessionIds(events, session);
  const missingTraces = checkTraces(events);
  const missingBidirectional = checkBidirectional(events);
  if (agent && checkBrainModified(agent, events) && !missingSessions.length && !missingTraces.length && !missingBidirectional.length) { setMarker(session, "pre-compact"); return; }
  setMarker(session, "pre-compact");
  const label = agent ? agent[0].toUpperCase() + agent.slice(1) : "Agent";
  const brain = agent ? `~/.agent-memory/agents/${agent}/brain` : "your brain files";
  const extras = extraBodyFiles(events).map(([file, reason]) => `- ${brain.replace(/\/brain$/, "")}/${file}: ${reason}`).join("\n");
  const prompt = `BRAIN SYNC REMINDER — Context is about to compress.\n\n@${label}, update your brain files now. This is session [${sessionLabel(session)}] in project [${project}].\n\nWrite a specific entry to ${brain}/memory.md with the work completed, decisions and why, and what's next. Add the required ISO timestamp, project, agent, and session metadata. Use trace-search to find a related entry and include a backward trace; the protected writer adds the reciprocal forward trace. Use ↪ trace: none (new topic) only when no related entry exists. Update the relevant .agent-memory/comms/ACTIVITY.md too.\n${extras ? `\nAlso consider these files:\n${extras}\n` : ""}${missingSessions.length ? `\nMissing session tags in: ${missingSessions.join(", ")}. Fix them.\n` : ""}${missingTraces.length ? `\nMissing traces in: ${missingTraces.join(", ")}. Fix them.\n` : ""}${missingBidirectional.length ? `\nMissing reciprocal links: ${missingBidirectional.map((item) => `${item.file}: ${item.old_ref} → ${item.new_ref}`).join("; ")}. Retry protected-log writes through agent-log.\n` : ""}\nWrite a concise note in your own voice, then continue your work.`;
  emit(prompt);
}

function handleStop(input: Dict): void {
  const session = String(input.session_id || "unknown");
  const path = String(input.transcript_path || "");
  if (hasMarker(session, "stop") || !path || !existsSync(path)) return;
  const events = readTranscript(path);
  if (!events.length) { setMarker(session, "stop"); return; }
  const agent = detectAgent(events);
  if (!agent) { setMarker(session, "stop"); return; }
  const project = detectProject(String(input.cwd || ""));
  const activity = sinceLastSync(events);
  const score = activity.total_score as number;
  const brainSynced = checkBrainModified(agent, events);
  const activityLogged = checkActivityLogged(events, String(input.cwd || ""));
  const stale = checkBrainStaleness(agent);
  const past = unsyncMarkers(agent);
  const needBrain = !brainSynced && (score >= lightThreshold || stale.is_stale || past.length > 0);
  const needActivity = !activityLogged && score >= lightThreshold;
  const missingSessions = score >= lightThreshold ? checkSessionIds(events, session) : [];
  const missingTraces = score >= lightThreshold ? checkTraces(events) : [];
  const missingBidirectional = score >= lightThreshold ? checkBidirectional(events) : [];
  if (!needBrain && !needActivity && !missingSessions.length && !missingTraces.length && !missingBidirectional.length) {
    setMarker(session, "stop");
    if (brainSynced) for (const marker of past) { try { unlinkSync(join(unsyncRoot, `${String(marker.session_id || "").slice(0, 8)}-${agent}.json`)); } catch { } }
    return;
  }
  const label = agent[0].toUpperCase() + agent.slice(1);
  const now = currentTimestamp();
  const details: string[] = [formatUnsync(past, now)].filter(Boolean);
  if (needBrain) details.push(`Brain files are not updated. Activity score ${score.toFixed(1)}; ${stale.is_stale ? `last entry ${stale.hours_since_last ?? "unknown"} hours ago` : "recent notes are fresh"}. Reconcile ~/.agent-memory/agents/${agent}/brain/memory.md for session [${sessionLabel(session)}] in [${project}].`);
  if (needActivity) details.push(`The project ACTIVITY.md was not updated for [${project}]. Record this session with [session:${sessionLabel(session)}].`);
  if (missingSessions.length) details.push(`Missing session tags in: ${missingSessions.join(", ")}.`);
  if (missingTraces.length) details.push(`Missing traces in: ${missingTraces.join(", ")}. Use trace-search, then write through agent-log so reciprocal traces are preserved.`);
  if (missingBidirectional.length) details.push(`Missing reciprocal links: ${missingBidirectional.map((item) => `${item.file}: ${item.old_ref} → ${item.new_ref}`).join("; ")}. Retry protected-log writes through agent-log.`);
  setMarker(session, "stop");
  cleanMarkers();
  emit(`SESSION END — SYNC CHECK\n\n@${label}, ${details.join("\n\n")}\n\nAdd a concise note with a verified older-entry trace, or ↪ trace: none (new topic) when unrelated. Then continue your work.`);
}

function handleSessionEnd(input: Dict): void {
  const session = String(input.session_id || "unknown");
  const path = String(input.transcript_path || "");
  if (hasMarker(session, "session-end")) return;
  setMarker(session, "session-end");
  if (!path || !existsSync(path)) return;
  const events = readTranscript(path);
  const agent = detectAgent(events);
  if (!agent) return;
  const activity = sinceLastSync(events);
  const brainSynced = checkBrainModified(agent, events);
  const activityLogged = checkActivityLogged(events, String(input.cwd || ""));
  if (brainSynced && activityLogged || activity.total_score < lightThreshold) return;
  mkdirSync(unsyncRoot, { recursive: true });
  const data = { session_id: session, agent, project: detectProject(String(input.cwd || "")), score: activity.total_score, brain_synced: brainSynced, activity_logged: activityLogged, tool_counts: activity.tool_counts, files_changed: [...activity.files_changed], user_messages: activity.user_message_count, timestamp: currentTimestamp(), transcript: path };
  writeFileSync(join(unsyncRoot, `${session.slice(0, 8)}-${agent}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

function handlePostToolUse(input: Dict): void {
  const session = String(input.session_id || "unknown");
  const path = String(input.transcript_path || "");
  if (hasMarker(session, "context-monitor") || !path || !existsSync(path)) return;
  let size = 0;
  try { size = statSync(path).size; } catch { return; }
  const events = readTranscript(path);
  const agent = detectAgent(events);
  if (size < contextThreshold) {
    if (!checkpointTools.has(String(input.tool_name || "")) || !agent) return;
    const activity = sinceLastSync(events);
    if (activity.total_score < lightThreshold) return;
    const signals = [...new Set((activity.events_since_sync as Event[]).flatMap((event) => toolUses([event]).map(({ block }) => block.name === "Task" ? "subagent milestone" : ["WebFetch", "WebSearch"].includes(block.name) ? "research activity" : block.name === "Bash" ? "terminal activity" : ["Edit", "Write", "apply_patch"].includes(block.name) ? "meaningful file change" : "" ).filter(Boolean)))];
    if (!signals.length) return;
    const bucket = Math.floor(activity.total_score / lightThreshold);
    const marker = `checkpoint-${activity.last_sync_index}-${bucket}`;
    if (hasMarker(session, marker)) return;
    setMarker(session, marker);
    const label = agent[0].toUpperCase() + agent.slice(1);
    emit(`ACTIVITY CHECKPOINT — soft reminder\n\n@${label}, activity since your last note sync crossed a checkpoint (${activity.total_score.toFixed(1)}; ${signals.join(", ")}). If this phase produced an important decision, learning, blocker, meaningful change, or verified result, capture it in brain/memory.md and the relevant ACTIVITY.md with session [${sessionLabel(session)}] and a bidirectional trace. This reminder is advisory; continue your work.`);
    return;
  }
  setMarker(session, "context-monitor");
  if (agent && checkBrainModified(agent, events) && !checkSessionIds(events, session).length && !checkTraces(events).length && !checkBidirectional(events).length) return;
  const label = agent ? agent[0].toUpperCase() + agent.slice(1) : "Agent";
  emit(`CONTEXT MONITOR — transcript is about ${Math.round(size / 1024 / 1024)} MB.\n\n@${label}, write durable notes to your brain/memory.md and the relevant ACTIVITY.md now, with an ISO timestamp, project, session [${sessionLabel(session)}], and a verified bidirectional trace. Then continue your work.`);
}

function main(): void {
  let input: Dict;
  try { input = JSON.parse(readFileSync(0, "utf8")) as Dict; }
  catch { return; }
  try {
    switch (input.hook_event_name) {
      case "PreCompact": handlePreCompact(input); break;
      case "PostToolUse": handlePostToolUse(input); break;
      case "Stop": handleStop(input); break;
      case "SessionEnd": handleSessionEnd(input); break;
    }
  } catch { return; }
}

if (require.main === module) main();
