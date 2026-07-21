#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dispatchWithSource } from "../../core/dispatch";

const toolMappings: Record<string, string> = {
  run_command: "Bash",
  write_to_file: "Write",
  replace_file_content: "Edit",
  view_file: "Read",
  grep_search: "Grep",
  find_by_name: "Glob",
  invoke_subagent: "Agent",
};

type Payload = Record<string, unknown>;

function readPayload(): Payload {
  try {
    const value: unknown = JSON.parse(readFileSync(0, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Payload : {};
  } catch {
    return {};
  }
}

function normalizeArgs(toolName: string, raw: Payload): Payload {
  if (toolName === "Bash") return { command: raw.CommandLine ?? "", workdir: raw.Cwd, cwd: raw.Cwd };
  if (toolName === "Write") return { file_path: raw.TargetFile ?? "", content: raw.CodeContent ?? "" };
  if (toolName === "Edit") return { file_path: raw.TargetFile ?? "", old_string: raw.TargetContent ?? "", new_string: raw.ReplacementContent ?? "" };
  if (toolName === "Read") return { file_path: raw.AbsolutePath ?? "" };
  if (toolName === "Grep") return { path: raw.SearchPath ?? "", query: raw.Query ?? "" };
  if (toolName === "Glob") return { path: raw.SearchDirectory ?? "", pattern: raw.Pattern ?? "" };
  if (toolName === "Agent") {
    const subagents = Array.isArray(raw.Subagents) ? raw.Subagents : [];
    const prompts = subagents.flatMap((item) => item && typeof item === "object" && typeof (item as Payload).Prompt === "string" ? [(item as Payload).Prompt as string] : []);
    const types = subagents.flatMap((item) => item && typeof item === "object" ? [String((item as Payload).TypeName ?? (item as Payload).Role ?? "")] : []);
    return { prompt: prompts.join("\n\n"), subagent_type: types[0] || "general-purpose", subagents };
  }
  return raw;
}

function dispatchToCore(payload: Payload) {
  return dispatchWithSource("antigravity", payload as Parameters<typeof dispatchWithSource>[1]);
}

function main(): void {
  const args = process.argv.slice(2);
  const eventIndex = args.indexOf("--event");
  const payload = readPayload();
  let event = eventIndex >= 0 ? args[eventIndex + 1] ?? "" : String(payload.hook_event_name ?? "");
  if (!event) {
    if (payload.toolCall) event = payload.error !== undefined || Number(payload.stepIdx ?? 0) > 0 ? "PostToolUse" : "PreToolUse";
    else if (payload.executionNum !== undefined || payload.terminationReason !== undefined) event = "Stop";
    else if (payload.invocationNum !== undefined) event = "PreInvocation";
  }

  const call = payload.toolCall && typeof payload.toolCall === "object" ? payload.toolCall as Payload : {};
  const rawToolName = String(call.name ?? "");
  const toolName = toolMappings[rawToolName] ?? rawToolName;
  const rawToolArgs = call.args && typeof call.args === "object" ? call.args as Payload : {};
  const sessionId = String(payload.conversationId ?? payload.sessionId ?? "");
  const workspacePaths = Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
  const cwd = String(rawToolArgs.Cwd ?? workspacePaths[0] ?? process.cwd());
  const result = dispatchToCore({
    hook_event_name: event,
    tool_name: toolName,
    tool_input: normalizeArgs(toolName, rawToolArgs),
    session_id: sessionId,
    cwd,
  });

  if (event === "PreToolUse") {
    process.stdout.write(`${JSON.stringify(result.blocked ? { decision: "deny", reason: result.reason || "Action blocked by agent policy." } : { decision: "allow" })}\n`);
  } else if (event === "PostToolUse") {
    process.stdout.write("{}\n");
  } else if (event === "Stop") {
    const reminder = result.contexts.join("\n\n");
    if (result.blocked || (reminder && (reminder.includes("REMINDER") || reminder.toLowerCase().includes("trace")))) {
      process.stdout.write(`${JSON.stringify({ decision: "continue", reason: result.reason || reminder })}\n`);
    } else {
      process.stdout.write(`${JSON.stringify({ decision: "stop" })}\n`);
    }
  } else if (event === "PreInvocation") {
    const contexts = [...result.contexts];
    if (sessionId) {
      const shortId = sessionId.split(":").at(-1)?.slice(0, 8) ?? "";
      contexts.push(`[agent Runtime] Active Harness: antigravity | Session: antigravity:${shortId} | Mandatory log format: [session:antigravity:${shortId}]`);
    }
    process.stdout.write(`${JSON.stringify({ injectSteps: contexts.map((message) => ({ ephemeralMessage: message })) })}\n`);
  } else {
    process.stdout.write("{}\n");
  }
}

if (require.main === module) main();
