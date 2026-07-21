#!/usr/bin/env node

import { parseJsonBytes, readStdinBytes, recordHarnessEvent, resolveCodexSessionId, runPipeline } from "../../../common";

function main(): void {
  const raw = readStdinBytes();
  const payload = parseJsonBytes(raw) ?? { argv: process.argv.slice(2), raw: raw.toString("utf8") };
  const sessionId = typeof payload.session_id === "string" ? payload.session_id : resolveCodexSessionId();
  const eventName = String(payload.event ?? payload.type ?? "turn_complete");
  recordHarnessEvent({
    source: "codex",
    event: eventName,
    sessionId,
    cwd: process.cwd(),
    active: true,
    extra: { turn_id: payload.turn_id, title: payload.title },
    details: { title: payload.title, message: payload.message, turn_id: payload.turn_id },
  });
  runPipeline("turn_complete", payload, "codex", false);
}

if (require.main === module) main();
