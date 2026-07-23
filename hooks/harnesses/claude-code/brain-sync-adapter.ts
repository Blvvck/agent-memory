#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runBrainSync, type MemoryTranscriptEvent } from "../../core/brain-sync";

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
  if (!transcriptPath || !existsSync(transcriptPath)) return;
  let transcriptSize = 0;
  try { transcriptSize = statSync(transcriptPath).size; }
  catch { return; }

  const sessionId = String(payload.session_id || "unknown");
  const context = runBrainSync(String(payload.hook_event_name || ""), {
    source: "claude",
    sessionId,
    sessionLabel: sessionLabel(sessionId),
    cwd: String(payload.cwd || process.cwd()),
    toolName: typeof payload.tool_name === "string" ? payload.tool_name : undefined,
    transcriptSize,
    events: readTranscript(transcriptPath),
  });
  if (context) process.stdout.write(`${JSON.stringify({ continue: true, additionalContext: context })}\n`);
}

if (require.main === module) {
  try { main(); }
  catch { process.exitCode = 0; }
}
