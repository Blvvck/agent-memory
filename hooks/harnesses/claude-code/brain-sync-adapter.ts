#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { hasBrainSyncSessionState, recordBrainSyncSessionEvent, recoverStaleSessions, runBrainSync, storeBrainSyncSnapshot, type MemoryTranscriptEvent } from "../../core/brain-sync";
import { shortSessionLabel } from "../../../common";

type Dict = Record<string, any>;

const sessionCache = join(tmpdir(), "claude-session-id");

function asRecord(value: unknown): Dict { return value && typeof value === "object" && !Array.isArray(value) ? value as Dict : {}; }

function normalizeEvent(raw: Dict): MemoryTranscriptEvent {
  const message = asRecord(raw.message);
  const content = message.content;
  if (typeof content === "string") return { role: String(message.role || ""), type: typeof raw.type === "string" ? raw.type : undefined, text: content, toolCalls: [], toolResults: [] };
  const blocks = Array.isArray(content) ? content.map(asRecord) : [];
  return {
    role: String(message.role || ""),
    type: typeof raw.type === "string" ? raw.type : undefined,
    text: blocks.flatMap((block) => block.type === "text" && typeof block.text === "string" ? [block.text] : []).join("\n"),
    toolCalls: blocks.flatMap((block) => block.type === "tool_use" ? [{ name: String(block.name || ""), input: asRecord(block.input) }] : []),
    toolResults: blocks.flatMap((block) => block.type === "tool_result" ? [{ isError: Boolean(block.is_error) }] : []),
  };
}

function readTranscript(path: string): MemoryTranscriptEvent[] {
  try {
    return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).slice(-2000).flatMap((line) => {
      try { return [normalizeEvent(JSON.parse(line) as Dict)]; }
      catch { return []; }
    });
  } catch { return []; }
}

function sessionLabel(sessionId: string): string {
  if (sessionId && sessionId !== "unknown") {
    const machine = hostname().toLowerCase().includes("desktop") || hostname().toLowerCase().includes("omen") ? "omen" : "mac";
    return `${machine}:${sessionId.slice(0, 8)}`;
  }
  try {
    const raw = readFileSync(sessionCache, "utf8").trim();
    const cached = raw.startsWith("{") ? JSON.parse(raw) as Dict : null;
    return String(cached?.short_session || raw || "unknown");
  } catch { return "unknown"; }
}

function main(): void {
  let payload: Dict;
  try { payload = JSON.parse(readFileSync(0, "utf8")) as Dict; }
  catch { return; }

  const transcriptPath = typeof payload.transcript_path === "string" ? payload.transcript_path : "";
  const event = String(payload.hook_event_name || "");
  activeHookEvent = event;
  if (event !== "SessionStart" && (!transcriptPath || !existsSync(transcriptPath))) return;
  const sessionId = String(payload.session_id || "unknown");
  const cwd = String(payload.cwd || process.cwd());
  if (sessionId !== "unknown" && (event === "SessionStart" || !hasBrainSyncSessionState("claude", sessionId))) recoverStaleSessions();
  const events = readTranscript(transcriptPath);
  if (transcriptPath && existsSync(transcriptPath)) storeBrainSyncSnapshot("claude", sessionId, events);
  const context = runBrainSync(event, {
    source: "claude",
    sessionId,
    sessionLabel: shortSessionLabel("claude", sessionId) || sessionLabel(sessionId),
    cwd,
    toolName: typeof payload.tool_name === "string" ? payload.tool_name : undefined,
    events,
  });
  if (sessionId !== "unknown") recordBrainSyncSessionEvent("claude", sessionId, cwd, event);
  if (!context) return;
  if (event === "PreCompact") process.stdout.write(`${JSON.stringify({ decision: "block", reason: context })}\n`);
  else if (event === "Stop") process.stdout.write(`${JSON.stringify({ decision: "block", reason: context })}\n`);
  else if (event === "SessionStart") process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } })}\n`);
  else if (event === "PostToolUse") process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  })}\n`);
}

function reportHookError(error: unknown): void {
  const reason = error instanceof Error ? error.message : String(error);
  const context = `Agent Memory brain-sync could not run: ${reason}. Resolve the selected project memory layout before continuing.`;
  const event = activeHookEvent;
  if (event === "PreCompact" || event === "Stop") {
    process.stdout.write(`${JSON.stringify({ decision: "block", reason: context })}\n`);
  } else if (event === "SessionStart" || event === "PostToolUse") {
    process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } })}\n`);
  } else {
    process.stdout.write(`${JSON.stringify({ systemMessage: context })}\n`);
  }
}

let activeHookEvent = "";

if (require.main === module) {
  try { main(); }
  catch (error) { reportHookError(error); }
}
