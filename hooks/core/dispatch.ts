#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { STATE_DIR, appendEvent, updateCurrentSession } from "../../common";
import { projectMemoryRoot } from "../../memory-paths";
import { syncSkills } from "../../skills";
import { snapshotInBackground, snapshotScopeInBackground } from "../../backup";
import { pendingCronSummary } from "../../crons";
import { appendBrainSyncEvent, hasBrainSyncSessionState, makeBrainSyncRequest, readBrainSyncEvents, recordBrainSyncSessionEvent, recoverStaleSessions, runBrainSync, type MemoryTranscriptEvent } from "./brain-sync";
import { promptFromPayload, wakeContext } from "./wake";

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

function brainSyncEvent(payload: HookPayload): MemoryTranscriptEvent | null {
  const toolName = String(payload.tool_name || "");
  const rawInput = payload.tool_input && typeof payload.tool_input === "object" && !Array.isArray(payload.tool_input) ? payload.tool_input as Record<string, unknown> : {};
  if (["PostToolUse", "PostToolUseFailure", "PostToolUseCapture"].includes(String(payload.hook_event_name || "")) && toolName) {
    const filePath = String(rawInput.file_path || rawInput.filePath || "");
    const normalizedPath = filePath.replace(/\\/g, "/");
    const memoryTarget = /(?:^|\/)agents\/[^/]+\/brain\//.test(normalizedPath) || /\/(?:\.agent-memory|\.claude|\.codex|\.opencode|\.agents|\.cursor)\//.test(normalizedPath);
    const writeContent = rawInput.new_string ?? rawInput.newString ?? rawInput.content ?? rawInput.CodeContent;
    const command = String(rawInput.command || "");
    const toolInput = ["Edit", "Write"].includes(toolName)
      ? { file_path: filePath, ...(memoryTarget && writeContent !== undefined ? { new_string: writeContent } : {}) }
      : toolName === "Bash"
        ? { workdir: rawInput.workdir || rawInput.cwd, command: /agent-log/i.test(command) ? command : /git\s+commit/i.test(command) ? "git commit" : /git\s+push/i.test(command) ? "git push" : /gh\s+pr\s+create/i.test(command) ? "gh pr create" : undefined }
        : toolName === "agent-log"
          ? rawInput
          : {};
    const response = payload.tool_response && typeof payload.tool_response === "object" ? payload.tool_response as Record<string, unknown> : {};
    return {
      role: "assistant",
      type: String(payload.hook_event_name),
      text: "",
      toolCalls: [{ name: toolName, input: toolInput }],
      toolResults: [{ isError: payload.error !== undefined || Boolean(response.isError) }],
    };
  }
  if (["UserPromptSubmit", "PreInvocation"].includes(String(payload.hook_event_name || ""))) {
    const message = payload.message && typeof payload.message === "object" ? payload.message as Record<string, unknown> : {};
    const content = message.content ?? payload.parts;
    const contentText = typeof content === "string" ? content : Array.isArray(content) ? content.flatMap((part) => {
      if (typeof part === "string") return [part];
      if (!part || typeof part !== "object") return [];
      const block = part as Record<string, unknown>;
      return typeof block.text === "string" ? [block.text] : typeof block.content === "string" ? [block.content] : [];
    }).join("\n") : "";
    const prompt = String(payload.prompt || payload.lastUserInput || contentText || "");
    return prompt ? { role: "user", text: prompt, toolCalls: [], toolResults: [] } : null;
  }
  return null;
}

function runSharedBrainSync(source: string, event: string, payload: HookPayload, contexts: string[]): void {
  if (source === "claude") return;
  const sessionId = String(payload.session_id || "");
  const cwd = String(payload.cwd || process.cwd());
  const normalizedEvent = lifecycleEvent(source, event);
  const captured = brainSyncEvent({ ...payload, hook_event_name: event });
  let events = readBrainSyncEvents(source, sessionId);
  if (captured) {
    const eventId = source === "antigravity" && event === "PreInvocation" && captured.role === "user"
      ? `prompt-${createHash("sha256").update(captured.text).digest("hex").slice(0, 20)}`
      : String(payload.tool_use_id || payload.call_id || payload.callID || payload.message_id || payload.turn_id || "");
    events = appendBrainSyncEvent(source, sessionId, captured, eventId || undefined);
  }
  if (source === "antigravity" && event === "PostToolUse") return;
  if (!["PostToolUse", "PostToolUseFailure", "PreCompact", "Stop", "SessionEnd", "SessionStart", "PreInvocation", "PostInvocation"].includes(event)) return;
  const prompt = runBrainSync(normalizedEvent, makeBrainSyncRequest(source, sessionId, cwd, events, String(payload.tool_name || "") || undefined));
  if (prompt) contexts.push(prompt);
}

function lifecycleEvent(source: string, event: string): string {
  return source === "antigravity" && event === "PreInvocation" ? "SessionStart" : source === "antigravity" && event === "PostInvocation" ? "PostToolUse" : event;
}

const memorySegments = [".agent-memory", ".claude", ".codex", ".opencode", ".agents", ".cursor"];
function overwriteSnapshotMarker(scope: string): string {
  return join(STATE_DIR, `overwrite-snapshot-${scope}`);
}

export function claimOverwriteSnapshot(scope: string): boolean {
  const marker = overwriteSnapshotMarker(scope);
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    mkdirSync(marker);
    return true;
  } catch {
    const guard = `${marker}.lock`;
    try { mkdirSync(guard); }
    catch {
      try {
        if (Date.now() - statSync(guard).mtimeMs < 300_000) return false;
        rmdirSync(guard);
      } catch { return false; }
      try { mkdirSync(guard); }
      catch { return false; }
    }
    try {
      let stale = true;
      try { stale = Date.now() - statSync(marker).mtimeMs >= 300_000; }
      catch { stale = true; }
      if (!stale) return false;
      const stolen = `${marker}.stale-${process.pid}-${Date.now()}`;
      try { renameSync(marker, stolen); } catch { /* already gone */ }
      try { rmdirSync(stolen); } catch { /* best effort */ }
      try { mkdirSync(marker); return true; }
      catch { return false; }
    } finally {
      try { rmdirSync(guard); } catch { /* best effort */ }
    }
  }
}

function isMemoryFile(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  const globalRoot = join(homedir(), ".agent-memory").replace(/\\/g, "/");
  return normalized.startsWith(globalRoot) || normalized.split("/").some((part) => memorySegments.includes(part));
}

function maybeSnapshotBeforeOverwrite(payload: HookPayload, toolName: string, cwd: string): void {
  if (toolName !== "Write") return;
  const input = payload.tool_input && typeof payload.tool_input === "object" && !Array.isArray(payload.tool_input) ? payload.tool_input as Record<string, unknown> : {};
  const target = String(input.file_path || input.path || input.filePath || "");
  if (!target || !isMemoryFile(target)) return;
  if (!existsSync(target)) return;
  const globalRoot = join(homedir(), ".agent-memory").replace(/\\/g, "/");
  const isGlobal = target.replace(/\\/g, "/").startsWith(globalRoot);
  let key = "global";
  if (!isGlobal) {
    try { key = createHash("sha256").update(projectMemoryRoot(cwd)).digest("hex").slice(0, 16); }
    catch { key = "project"; }
  }
  if (!claimOverwriteSnapshot(key)) return;
  try { snapshotScopeInBackground(isGlobal ? "global" : "project"); }
  catch { /* backups fail open */ }
}

function syncSkillsOnStart(cwd: string): void {
  try {
    const globalRoot = join(homedir(), ".agent-memory");
    const roots = new Set<string>();
    if (existsSync(globalRoot)) roots.add(globalRoot);
    try {
      const projectRoot = projectMemoryRoot(cwd);
      if (resolve(projectRoot) !== resolve(globalRoot) && existsSync(projectRoot)) roots.add(projectRoot);
    } catch {
      return;
    }
    for (const root of roots) {
      try { syncSkills(root, true); }
      catch { continue; }
    }
  } catch {
    return;
  }
}

export function dispatch(payload: HookPayload): HookResult {
  const event = payload.hook_event_name || "";
  const toolName = payload.tool_name || "";
  const blocks: string[] = [];
  const contexts: string[] = [];
  if (!event) return { blocked: false, reason: "", contexts };

  logInvocation(payload, event);
  const source = process.env.AGENT_HOOK_SOURCE || "unknown";
  const sessionId = String(payload.session_id || "");
  const cwd = String(payload.cwd || process.cwd());
  const stateEvent = lifecycleEvent(source, event);
  const firstAntigravityTurn = source === "antigravity" && event === "PreInvocation" && (!sessionId || !hasBrainSyncSessionState(source, sessionId));
  try {
    if (source !== "claude" && sessionId && (stateEvent === "SessionStart" || !hasBrainSyncSessionState(source, sessionId))) recoverStaleSessions();
    runSharedBrainSync(source, event, payload, contexts);
    if (source !== "claude") recordBrainSyncSessionEvent(source, sessionId, cwd, stateEvent);
  } catch (error) {
    const reason = `Agent Memory cannot resolve this project's memory safely: ${error instanceof Error ? error.message : String(error)}. Resolve the single selected memory directory before continuing.`;
    contexts.push(reason);
    if (["PreToolUse", "UserPromptSubmit"].includes(event)) blocks.push(reason);
  }
  if (event === "SessionStart" || firstAntigravityTurn) {
    syncSkillsOnStart(cwd);
    const pending = pendingCronSummary();
    if (pending) contexts.push(pending);
  }
  if (event === "SessionEnd" || event === "PreCompact") {
    try { snapshotInBackground(cwd); }
    catch { /* backups fail open */ }
  }
  if (source !== "claude" && ["UserPromptSubmit", "PreInvocation"].includes(event)) {
    try {
      const wake = wakeContext(promptFromPayload(payload), cwd);
      if (wake) contexts.push(wake);
    } catch { /* wake detection fails open */ }
  }
  if (event === "PreToolUse") {
    maybeSnapshotBeforeOverwrite(payload, toolName, cwd);
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
