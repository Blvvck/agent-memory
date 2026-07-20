#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { tmpdir } from "node:os";

interface CachePayload {
  machine: string;
  session_id: string;
  short_session: string;
  updated_at: string;
}

const cacheFile = join(tmpdir(), "claude-session-id");
const host = hostname().toLowerCase();
const machine = host.includes("desktop") || host.includes("omen") ? "omen" : "mac";

function main(): void {
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(readFileSync(0, "utf8")) as Record<string, unknown>;
  } catch {
    return;
  }
  const sessionId = typeof input.session_id === "string" ? input.session_id : "";
  if (!sessionId) return;

  const payload: CachePayload = {
    machine,
    session_id: sessionId,
    short_session: `${machine}:${sessionId.slice(0, 8)}`,
    updated_at: new Date().toISOString(),
  };
  try {
    const cached = JSON.parse(readFileSync(cacheFile, "utf8")) as Record<string, unknown>;
    if (cached.session_id === sessionId) return;
  } catch {
  }
  writeFileSync(cacheFile, JSON.stringify(payload), "utf8");
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exitCode = 0;
  }
}
