#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { dispatchWithSource, type HookResult } from "../../core/dispatch";

type Payload = Record<string, unknown>;

const toolMappings: Record<string, string> = {
  Shell: "Bash",
  Write: "Write",
  Edit: "Edit",
  Read: "Read",
  Task: "Agent",
};

function readPayload(): Payload {
  try {
    const value: unknown = JSON.parse(readFileSync(0, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Payload : {};
  } catch {
    return {};
  }
}

function objectValue(value: unknown): Payload {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Payload;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Payload;
    } catch {
    }
  }
  return {};
}

function normalize(payload: Payload): { event: string; normalized: Payload } {
  const cursorEvent = String(payload.hook_event_name ?? "");
  const eventMappings: Record<string, string> = {
    sessionStart: "SessionStart",
    sessionEnd: "SessionEnd",
    preToolUse: "PreToolUse",
    postToolUse: "PostToolUse",
    postToolUseFailure: "PostToolUseFailure",
    subagentStart: "PreToolUse",
    subagentStop: "PostToolUse",
    beforeSubmitPrompt: "UserPromptSubmit",
    preCompact: "PreCompact",
    stop: "Stop",
  };
  const event = eventMappings[cursorEvent] ?? cursorEvent;
  const rawToolName = String(payload.tool_name ?? (cursorEvent === "subagentStart" ? "Task" : ""));
  const rawInput = objectValue(payload.tool_input);
  const cwd = String(payload.cwd ?? payload.working_directory ?? (Array.isArray(payload.workspace_roots) ? payload.workspace_roots[0] : "") ?? process.cwd());
  const toolInput = rawToolName === "Shell"
    ? { ...rawInput, command: rawInput.command ?? payload.command, workdir: rawInput.working_directory ?? cwd }
    : rawToolName === "Task"
      ? { ...rawInput, prompt: payload.task ?? rawInput.prompt ?? rawInput.description, subagent_type: payload.subagent_type ?? rawInput.subagent_type }
      : rawToolName === "Write" || rawToolName === "Edit"
        ? { ...rawInput, file_path: payload.file_path ?? rawInput.file_path, ...(Array.isArray(payload.edits) ? payload.edits[0] : {}) }
        : rawToolName === "Read"
          ? { ...rawInput, file_path: payload.file_path ?? rawInput.file_path }
          : rawInput;
  const normalized: Payload = {
    ...payload,
    hook_event_name: event,
    session_id: payload.session_id ?? payload.conversation_id,
    cwd,
    tool_name: toolMappings[rawToolName] ?? rawToolName,
    tool_input: toolInput,
    ...(cursorEvent === "beforeSubmitPrompt" ? { prompt: payload.prompt } : {}),
    ...(cursorEvent === "postToolUseFailure" ? { error: payload.error_message ?? payload.failure_type } : {}),
    ...(cursorEvent === "postToolUse" ? { tool_response: objectValue(payload.tool_output) } : {}),
  };
  return { event: cursorEvent, normalized };
}

function emit(event: string, result: HookResult): void {
  if (event === "preToolUse" || event === "subagentStart") {
    process.stdout.write(`${JSON.stringify(result.blocked
      ? { permission: "deny", user_message: result.reason || "Action blocked by Agent Memory policy." }
      : { permission: "allow" })}\n`);
    return;
  }
  if (event === "beforeSubmitPrompt") {
    process.stdout.write(`${JSON.stringify(result.blocked
      ? { continue: false, user_message: result.reason }
      : { continue: true })}\n`);
    return;
  }
  if (event === "preCompact") {
    const reminder = [...result.contexts, ...(result.blocked ? [result.reason] : [])].filter(Boolean).join("\n\n");
    process.stdout.write(`${JSON.stringify(reminder ? { user_message: reminder } : {})}\n`);
    return;
  }
  if (event === "sessionStart") {
    let sharedInstructions = "";
    try { sharedInstructions = readFileSync(join(homedir(), ".agent-memory", "AGENTS.md"), "utf8").trim(); }
    catch { }
    const context = [...result.contexts, sharedInstructions].filter(Boolean).join("\n\n");
    process.stdout.write(`${JSON.stringify(context ? { additional_context: context } : {})}\n`);
    return;
  }
  if (event === "stop") {
    process.stdout.write(`${JSON.stringify(result.blocked ? { followup_message: result.reason } : {})}\n`);
    return;
  }
  if (event === "subagentStop") {
    process.stdout.write(`${JSON.stringify(result.blocked ? { followup_message: result.reason } : {})}\n`);
    return;
  }
  if (["postToolUse", "postToolUseFailure", "subagentStop"].includes(event)) {
    const context = result.contexts.join("\n\n");
    process.stdout.write(`${JSON.stringify(context ? { additional_context: context } : {})}\n`);
    return;
  }
  process.stdout.write("{}\n");
}

function main(): void {
  const payload = readPayload();
  const { event, normalized } = normalize(payload);
  if (!event) return;
  emit(event, dispatchWithSource("cursor", normalized as Parameters<typeof dispatchWithSource>[1]));
}

if (require.main === module) main();
