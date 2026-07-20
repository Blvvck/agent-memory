#!/usr/bin/env node

import { appendEvent, parseJsonBytes, readStdinBytes, resolveCodexSessionId, runPipeline, updateCurrentSession } from "../../../common";

function main(): void {
  const raw = readStdinBytes();
  const payload = parseJsonBytes(raw) ?? { argv: process.argv.slice(2), raw: raw.toString("utf8") };
  const sessionId = typeof payload.session_id === "string" ? payload.session_id : resolveCodexSessionId();
  const eventName = String(payload.event ?? payload.type ?? "turn_complete");
  updateCurrentSession("codex", {
    sessionId,
    event: eventName,
    cwd: process.cwd(),
    active: true,
    extra: { turn_id: payload.turn_id, title: payload.title },
  });
  appendEvent({
    source: "codex",
    type: "notify",
    event: eventName,
    title: payload.title,
    message: payload.message,
    session_id: sessionId,
    turn_id: payload.turn_id,
  });
  runPipeline("turn_complete", payload, "codex", false);
}

if (require.main === module) main();
