#!/usr/bin/env node

import { resolve } from "node:path";
import { addPending, entryHasTrace, entryIsSubstantive, missingTraceEntries, validSessionId } from "./trace-common";

interface HookPayload {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

interface Candidate {
  path: string;
  text: string;
}

const patchFilePattern = /^\*\*\* (Update|Add|Delete) File: (.+?)\s*$/gm;

function isTrackedNote(path: string): boolean {
  if (!path.endsWith(".md")) return false;
  if (path.includes("/agents/") && path.includes("/brain/") && !path.includes("/archive/")) return true;
  if (path.endsWith("/ACTIVITY.md") && path.includes("/.agent-memory/")) return true;
  return path.endsWith("/core/portfolio.md");
}

function patchSections(command: string, cwd: string): Candidate[] {
  patchFilePattern.lastIndex = 0;
  const matches = [...command.matchAll(patchFilePattern)];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? command.length;
    const path = resolve(cwd, match[2].trim());
    const text = command.slice(start, end).split(/\r?\n/).flatMap((line) => {
      if (line.startsWith("+") || line.startsWith(" ")) return [line.slice(1)];
      return [];
    }).join("\n");
    return { path, text };
  });
}

function writeCandidates(payload: HookPayload): Candidate[] {
  const input = payload.tool_input ?? {};
  if (payload.tool_name === "apply_patch") {
    const command = typeof input.command === "string" ? input.command : "";
    return patchSections(command, payload.cwd || process.cwd());
  }
  const path = typeof input.file_path === "string" ? input.file_path : "";
  const text = typeof input.new_string === "string" && input.new_string ? input.new_string :
    typeof input.content === "string" ? input.content : "";
  return path && text ? [{ path: resolve(path), text }] : [];
}

function main(): void {
  let payload: HookPayload;
  try {
    payload = JSON.parse(require("node:fs").readFileSync(0, "utf8")) as HookPayload;
  } catch {
    return;
  }
  const sessionId = payload.session_id ?? "";
  if (!validSessionId(sessionId)) return;

  const added = writeCandidates(payload).flatMap(({ path, text }) => {
    if (!isTrackedNote(path)) return [];
    const candidates = missingTraceEntries(text, sessionId).filter((entry) => entryIsSubstantive(entry) && !entryHasTrace(entry));
    return candidates.length ? addPending(sessionId, path, candidates) : [];
  });
  if (!added.length) return;

  const files = [...new Set(added.map((item) => item.path))].sort().join(", ");
  process.stdout.write(`${JSON.stringify({
    continue: true,
    additionalContext: `TRACE REMINDER: this agent note entry is being tracked until it has a trace. Finish the entry with \`↪ trace: ...\` or \`↪ trace: none (new topic)\`. Pending file(s): ${files}`,
  })}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exitCode = 0;
  }
}
