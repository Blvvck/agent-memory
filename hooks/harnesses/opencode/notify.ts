#!/usr/bin/env node

import { appendFileSync, mkdirSync } from "node:fs";
import { STATE_DIR, appendEvent, parseJsonBytes, readStdinBytes, runPipelineCapture, updateCurrentSession } from "../../../common";
import { dispatchHook, normalizeToolPayload, parseHookResult, type HookResult } from "./dispatch";

type Payload = Record<string, unknown>;

function asRecord(value: unknown): Payload {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Payload : {};
}

function pickSessionId(payload: Payload): string | null {
  const properties = asRecord(payload.properties);
  const info = asRecord(payload.info);
  const propertyInfo = asRecord(properties.info);
  const value = payload.session_id || payload.sessionID || payload.id || info.id || properties.sessionID || propertyInfo.id;
  return typeof value === "string" && value ? value : null;
}

function pickCwd(payload: Payload): string {
  const properties = asRecord(payload.properties);
  const info = asRecord(payload.info);
  const propertyInfo = asRecord(properties.info);
  const value = payload.cwd || payload.directory || info.directory || properties.cwd || propertyInfo.directory;
  return typeof value === "string" && value ? value : process.cwd();
}

function summarizePayload(payload: Payload): Payload {
  const info = asRecord(payload.info);
  const properties = asRecord(payload.properties);
  const propertyInfo = asRecord(properties.info);
  return {
    agent: payload.agent || properties.agent,
    tool_name: payload.tool || properties.tool,
    call_id: payload.callID || payload.call_id || properties.callID,
    message_id: payload.messageID || payload.message_id || properties.messageID,
    command_name: payload.name || properties.name,
    permission: payload.permission || properties.permission,
    request_id: payload.requestID || payload.request_id || properties.requestID,
    reply: payload.reply || properties.reply,
    title: info.title || propertyInfo.title,
    session_slug: info.slug || propertyInfo.slug,
  };
}

function transcriptFile(sessionId: string | null): string | null {
  if (!sessionId) return null;
  const safeId = sessionId.replace(/[^A-Za-z0-9_.-]/g, "_");
  const directory = `${STATE_DIR}/opencode-transcripts`;
  mkdirSync(directory, { recursive: true });
  return `${directory}/${safeId}.jsonl`;
}

function appendTranscript(eventName: string, payload: Payload): string | null {
  const path = transcriptFile(pickSessionId(payload));
  if (!path) return null;
  let record: Payload | null = null;
  if (eventName === "chat_message") {
    const message = payload.message;
    if (message && typeof message === "object" && !Array.isArray(message)) {
      const value = { ...message as Payload };
      if (!value.content && payload.parts) value.content = payload.parts;
      record = { message: value };
    } else {
      record = { message: { role: "user", content: payload.parts || [] } };
    }
  } else if (eventName === "tool_execute_before") {
    const normalized = normalizeToolPayload("PreToolUse", payload);
    record = {
      message: {
        role: "assistant",
        content: [{ type: "tool_use", name: normalized.tool_name, input: normalized.tool_input }],
      },
    };
  }
  if (record) appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
  return path;
}

function runPipelineResult(eventName: string, payload: Payload): HookResult {
  const result = runPipelineCapture(eventName, payload, "opencode", false);
  return parseHookResult(parseLastJson(result.stdout));
}

function parseLastJson(output: string): Payload {
  for (const line of output.trim().split(/\r?\n/).reverse()) {
    try {
      const value: unknown = JSON.parse(line);
      if (value && typeof value === "object" && !Array.isArray(value)) return value as Payload;
    } catch {
      continue;
    }
  }
  return {};
}

function mergeResults(...results: (HookResult | null)[]): HookResult {
  const merged: HookResult = { blocked: false, reason: "", contexts: [], raw: {} };
  for (const result of results) {
    if (!result) continue;
    merged.blocked ||= result.blocked;
    if (result.reason) merged.reason = [...new Set([merged.reason, result.reason].filter(Boolean))].join("\n\n");
    merged.contexts.push(...result.contexts);
    if (Object.keys(result.raw).length) merged.raw = result.raw;
  }
  merged.contexts = [...new Set(merged.contexts)];
  return merged;
}

function emitResult(result: HookResult): number {
  if (!result.blocked && !result.contexts.length) return 0;
  process.stdout.write(`${JSON.stringify({ blocked: result.blocked, reason: result.reason, contexts: result.contexts })}\n`);
  return result.blocked ? 2 : 0;
}

function main(): void {
  const argv = process.argv.slice(2);
  const eventIndex = argv.indexOf("--event");
  const eventName = eventIndex >= 0 ? argv[eventIndex + 1] : undefined;
  const strict = argv.includes("--strict");
  if (!eventName) {
    process.stderr.write("notify requires --event <name>\n");
    process.exitCode = 2;
    return;
  }

  const raw = readStdinBytes();
  const payload = parseJsonBytes(raw) ?? { argv, raw: raw.toString("utf8") };
  const sessionId = pickSessionId(payload);
  const cwd = pickCwd(payload);
  const active = eventName === "session_start" ? true : eventName === "session_end" ? false : undefined;
  const transcriptPath = appendTranscript(eventName, payload);
  if (transcriptPath) payload.transcript_path = transcriptPath;
  const extra = summarizePayload(payload);
  extra.transcript_path = transcriptPath ?? undefined;

  updateCurrentSession("opencode", { sessionId, event: eventName, cwd, active, extra });
  appendEvent({
    source: "opencode",
    type: "notify",
    event: eventName,
    session_id: sessionId,
    cwd,
    ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined && value !== null)),
  });

  let result: HookResult;
  if (eventName === "tool_execute_before") result = dispatchHook("PreToolUse", payload);
  else if (eventName === "tool_execute_after") result = dispatchHook("PostToolUse", payload);
  else if (eventName === "session_compacting") result = dispatchHook("PreCompact", payload);
  else if (eventName === "session_end") result = mergeResults(dispatchHook("SessionEnd", payload), runPipelineResult("session_end", payload));
  else if (eventName === "turn_complete") result = runPipelineResult("turn_complete", payload);
  else result = runPipelineResult(eventName, payload);

  const code = emitResult(result);
  process.exitCode = strict && code !== 0 ? code : result.blocked ? code : 0;
}

if (require.main === module) main();
