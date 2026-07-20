#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolvePending, validSessionId } from "./trace-common";

function main(): void {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(readFileSync(0, "utf8")) as Record<string, unknown>;
  } catch {
    return;
  }
  const sessionId = typeof payload.session_id === "string" ? payload.session_id : "";
  if (!validSessionId(sessionId)) return;
  const unresolved = resolvePending(sessionId);
  if (!unresolved.length) return;

  const details = unresolved.map((item) => `- ${item.path}:${item.line ?? "?"} — ${item.header}`).join("\n");
  process.stdout.write(`${JSON.stringify({
    continue: true,
    additionalContext: `AGENT TRACE REMINDER: before ending this turn, complete these note entries with \`↪ trace: ...\` or explicitly use \`↪ trace: none (new topic)\`. This is a reminder; continue the task after syncing:\n\n${details}`,
  })}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exitCode = 0;
  }
}
