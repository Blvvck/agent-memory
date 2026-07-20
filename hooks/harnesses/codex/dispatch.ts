#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dispatch, type HookResult } from "../../core/dispatch";

function readPayload(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(readFileSync(0, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function dispatchCodex(payload: Record<string, unknown>): HookResult {
  const previousSource = process.env.AGENT_HOOK_SOURCE;
  process.env.AGENT_HOOK_SOURCE = "codex";
  try {
    return dispatch(payload as Parameters<typeof dispatch>[0]);
  } finally {
    if (previousSource === undefined) delete process.env.AGENT_HOOK_SOURCE;
    else process.env.AGENT_HOOK_SOURCE = previousSource;
  }
}

function emitResult(event: string, result: HookResult): void {
  if (result.blocked) {
    if (["PreToolUse", "PostToolUse", "PostToolUseFailure", "Stop", "SubagentStop", "UserPromptSubmit"].includes(event)) {
      process.stdout.write(`${JSON.stringify({ decision: "block", reason: result.reason })}\n`);
    } else if (["PreCompact", "PostCompact"].includes(event)) {
      process.stdout.write(`${JSON.stringify({ continue: false, stopReason: result.reason })}\n`);
    } else {
      process.stdout.write(`${JSON.stringify({ systemMessage: result.reason })}\n`);
    }
    return;
  }
  if (!result.contexts.length) return;
  const context = [...new Set(result.contexts)].join("\n\n");
  if (!["PreToolUse", "PostToolUse", "PostToolUseFailure"].includes(event)) {
    process.stdout.write(`${JSON.stringify({ systemMessage: context })}\n`);
  } else {
    process.stdout.write(`${JSON.stringify({
      hookSpecificOutput: { hookEventName: event, additionalContext: context },
    })}\n`);
  }
}

function main(): void {
  const payload = readPayload();
  const event = String(payload.hook_event_name ?? "");
  if (!event) return;
  emitResult(event, dispatchCodex(payload));
}

if (require.main === module) main();
