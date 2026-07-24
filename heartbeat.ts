#!/usr/bin/env node

import { pendingUnsyncedSessions, recoverStaleSessions } from "./hooks/core/brain-sync";

function optionNumber(args: string[], name: string, fallback: number): number {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} requires a positive number.`);
  return value;
}

function scan(graceHours: number, quiet: boolean): void {
  const recovered = recoverStaleSessions(graceHours * 60 * 60 * 1000);
  const pending = pendingUnsyncedSessions();
  if (quiet && pending.length === 0) return;
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  process.stdout.write(`[agent-memory-heartbeat] ${timestamp}: ${recovered.length} stale session(s) recovered; ${pending.length} session(s) need memory sync.\n`);
  for (const session of pending) {
    const agent = session.agent === "unknown" ? "agent not identified" : `@${session.agent}`;
    process.stdout.write(`  ${agent} [${session.project}] ${session.source}:${session.session_id.slice(0, 8)} score=${session.score.toFixed(1)}\n`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const graceHours = optionNumber(args, "--grace-hours", 2);
  const intervalMinutes = optionNumber(args, "--interval-minutes", 10);
  const watch = args.includes("--watch");
  const quiet = args.includes("--quiet");
  scan(graceHours, quiet);
  if (watch) setInterval(() => scan(graceHours, quiet), intervalMinutes * 60 * 1000);
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(`agent-memory-heartbeat: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
