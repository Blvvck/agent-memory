#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { appendEvent, parseJsonBytes, runPipeline, updateCurrentSession } from "../../../common";
import { guardPayload } from "../../../protected-log-guard";

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const event = optionValue(args, "--event");
  const name = optionValue(args, "--name");
  const scriptPath = optionValue(args, "--script");
  if (!event || !name) {
    process.stderr.write("dispatch requires --event and --name\n");
    process.exitCode = 2;
    return;
  }

  const raw = readFileSync(0);
  const payload = parseJsonBytes(raw) ?? {};
  const start = Date.now();
  const sessionId = typeof payload.session_id === "string" ? payload.session_id : undefined;
  updateCurrentSession("claude", {
    sessionId,
    event,
    cwd: typeof payload.cwd === "string" ? payload.cwd : undefined,
    extra: { hook_name: name, tool_name: payload.tool_name },
  });
  appendEvent({ source: "claude", type: "hook_start", event, hook_name: name, script: scriptPath, session_id: sessionId, cwd: payload.cwd, tool_name: payload.tool_name });

  if (event === "claude_pre_tool") {
    const guardResult = guardPayload({ ...payload, hook_event_name: "PreToolUse" });
    if (guardResult) {
      process.stdout.write(`${JSON.stringify({ decision: "block", reason: guardResult })}\n`);
      process.exitCode = 2;
      return;
    }
  }

  const pipelineCode = runPipeline(event, payload, "claude", true);
  if (pipelineCode !== 0) {
    appendEvent({ source: "claude", type: "hook_end", event, hook_name: name, script: scriptPath, returncode: pipelineCode, duration_ms: Date.now() - start, stage: "shared_pipeline" });
    process.exitCode = pipelineCode;
    return;
  }

  if (!scriptPath) {
    appendEvent({ source: "claude", type: "hook_end", event, hook_name: name, returncode: 0, duration_ms: Date.now() - start, stage: "core_only" });
    return;
  }
  const result = spawnSync(process.execPath, [scriptPath], { input: raw, encoding: "buffer" });
  if (result.stdout?.length) process.stdout.write(result.stdout);
  if (result.stderr?.length) process.stderr.write(result.stderr);
  const returnCode = result.status ?? (result.error ? 1 : 0);
  appendEvent({ source: "claude", type: "hook_end", event, hook_name: name, script: scriptPath, returncode: returnCode, duration_ms: Date.now() - start, stage: "handler" });
  process.exitCode = returnCode;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const crashLog = join(tmpdir(), "claude-hook-crash.log");
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    appendFileSync(crashLog, `=== ${new Date().toISOString()} ===\n${detail}\n\n`);
    process.exitCode = 0;
  }
}
