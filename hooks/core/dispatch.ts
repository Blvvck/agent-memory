#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appendEvent, updateCurrentSession } from "../../common";

interface HookPayload extends Record<string, unknown> {
  hook_event_name?: string;
  tool_name?: string;
  session_id?: string;
  cwd?: string;
}

export interface HookResult {
  blocked: boolean;
  reason: string;
  contexts: string[];
}

const hookScripts: Record<string, string> = {
  guard: join(__dirname, "..", "..", "protected-log-guard.js"),
  spawn: join(__dirname, "agent-spawn-check.js"),
  trace_intent: join(__dirname, "trace-write-intent.js"),
  trace_stop: join(__dirname, "trace-stop-check.js"),
};

function readPayload(): HookPayload {
  try {
    const value: unknown = JSON.parse(readFileSync(0, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as HookPayload : {};
  } catch {
    return {};
  }
}

function runHook(name: string, payload: HookPayload): Record<string, unknown> | null {
  const result = spawnSync(process.execPath, [hookScripts[name]], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    cwd: typeof payload.cwd === "string" ? payload.cwd : process.cwd(),
    timeout: 20_000,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0 || !result.stdout.trim()) return null;
  for (const line of result.stdout.trim().split(/\r?\n/).reverse()) {
    try {
      const value: unknown = JSON.parse(line);
      if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

function collectResult(result: Record<string, unknown> | null, blocks: string[], contexts: string[]): void {
  if (!result) return;
  const hookOutput = result.hookSpecificOutput;
  if (hookOutput && typeof hookOutput === "object") {
    const nested = hookOutput as Record<string, unknown>;
    if (nested.additionalContext) contexts.push(String(nested.additionalContext));
    if (["deny", "ask"].includes(String(nested.permissionDecision))) {
      blocks.push(String(nested.permissionDecisionReason || nested.permissionDecision));
    }
  }
  if (result.status === "block" || result.decision === "block") {
    blocks.push(String(result.reason || result.message || "Memory hook blocked this action."));
  }
  if (result.additionalContext) contexts.push(String(result.additionalContext));
}

function logInvocation(payload: HookPayload, event: string): void {
  try {
    const source = process.env.AGENT_HOOK_SOURCE || "unknown";
    updateCurrentSession(source, {
      sessionId: payload.session_id,
      event,
      cwd: payload.cwd,
      extra: { tool_name: payload.tool_name },
    });
    appendEvent({
      source,
      type: "hook_invocation",
      event,
      session_id: payload.session_id,
      cwd: payload.cwd,
      tool_name: payload.tool_name,
    });
  } catch (error) {
    process.stderr.write(`[agent-hook] event logging skipped: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

export function dispatch(payload: HookPayload): HookResult {
  const event = payload.hook_event_name || "";
  const toolName = payload.tool_name || "";
  const blocks: string[] = [];
  const contexts: string[] = [];
  if (!event) return { blocked: false, reason: "", contexts };

  logInvocation(payload, event);
  if (event === "PreToolUse") {
    collectResult(runHook("guard", payload), blocks, contexts);
    if (["Write", "Edit", "apply_patch"].includes(toolName)) collectResult(runHook("trace_intent", payload), blocks, contexts);
    if (["Agent", "Task", "spawn_agent"].includes(toolName)) collectResult(runHook("spawn", payload), blocks, contexts);
  } else if (event === "Stop") {
    collectResult(runHook("trace_stop", payload), blocks, contexts);
  }

  return {
    blocked: blocks.length > 0,
    reason: [...new Set(blocks)].join("\n\n"),
    contexts: [...new Set(contexts)],
  };
}

export function dispatchWithSource(source: string, payload: HookPayload): HookResult {
  const previousSource = process.env.AGENT_HOOK_SOURCE;
  process.env.AGENT_HOOK_SOURCE = source;
  try {
    return dispatch(payload);
  } finally {
    if (previousSource === undefined) delete process.env.AGENT_HOOK_SOURCE;
    else process.env.AGENT_HOOK_SOURCE = previousSource;
  }
}

function main(): void {
  process.stdout.write(`${JSON.stringify(dispatch(readPayload()))}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`[agent-hook] dispatcher failed open: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}
