#!/usr/bin/env node

import { resolveCurrentSession } from "./common";

function main(): void {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const sourceIndex = args.indexOf("--source");
  const fieldIndex = args.indexOf("--field");
  const source = sourceIndex >= 0 ? args[sourceIndex + 1] : undefined;
  const field = fieldIndex >= 0 ? args[fieldIndex + 1] : undefined;

  if (source && !["claude", "codex", "opencode", "antigravity", "cursor"].includes(source)) {
    process.stderr.write("--source must be claude, codex, opencode, antigravity, or cursor\n");
    process.exitCode = 2;
    return;
  }

  const payload = resolveCurrentSession(source);
  if (!payload) {
    process.exitCode = 1;
    return;
  }
  if (field) {
    const value = payload[field];
    if (value === undefined || value === null) {
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${String(value)}\n`);
    return;
  }
  if (json) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  process.stdout.write(`${String(payload.short_session || payload.source || "unknown")}\n`);
}

if (require.main === module) main();
