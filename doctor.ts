#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { backupConfigPaths } from "./backup";

interface Check {
  name: string;
  ok: boolean | null;
  detail: string;
}

const ROOT = join(homedir(), ".agent-memory");

function commandExists(command: string): boolean {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [command], { encoding: "utf8" }).status === 0;
}

function versionOf(command: string): string {
  const args = command === "restic" ? ["version"] : ["--version"];
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 10_000 });
  if (result.status !== 0) return "";
  return (result.stdout || result.stderr).split("\n")[0].trim().slice(0, 120);
}

function nodeSqlite(): boolean {
  return spawnSync(process.execPath, ["--no-warnings", "-e", "require('node:sqlite')"], { encoding: "utf8" }).status === 0;
}

function symlinksWork(): boolean {
  const directory = join(tmpdir(), `agent-memory-doctor-${process.pid}`);
  try {
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "target"), "x", "utf8");
    symlinkSync(join(directory, "target"), join(directory, "link"));
    return existsSync(join(directory, "link"));
  } catch {
    return false;
  } finally {
    try { rmSync(directory, { recursive: true, force: true }); }
    catch { /* best effort */ }
  }
}

function doctor(json: boolean): void {
  const checks: Check[] = [];
  checks.push({ name: "platform", ok: true, detail: `${process.platform} ${process.arch}, Node ${process.version}` });
  checks.push({ name: "global memory", ok: existsSync(ROOT), detail: ROOT });

  for (const command of ["git", "restic", "sqlite3"]) {
    const found = commandExists(command);
    checks.push({ name: command, ok: found, detail: found ? versionOf(command) || "installed" : "not found" });
  }

  const sqlite = nodeSqlite();
  checks.push({ name: "node:sqlite", ok: sqlite, detail: sqlite ? "available as a fallback" : "unavailable; install sqlite3 or use Node 22+" });

  for (const command of ["claude", "codex", "opencode", "agy", "cursor-agent"]) {
    const found = commandExists(command);
    checks.push({ name: `harness:${command}`, ok: found, detail: found ? "installed" : "not found" });
  }

  checks.push({ name: "symlinks", ok: symlinksWork(), detail: process.platform === "win32" ? "Windows may need Developer Mode or an import file fallback" : "available" });

  const { repo, passwordFile: password } = backupConfigPaths();
  checks.push({ name: "backup repo", ok: existsSync(repo), detail: repo });
  checks.push({ name: "backup password", ok: existsSync(password), detail: password });
  if (process.platform === "win32" && existsSync(password)) {
    checks.push({ name: "password ACL", ok: null, detail: "Windows does not apply POSIX 0600; confirm the file is private" });
  }

  if (existsSync(join(ROOT, "backup.json"))) {
    try {
      JSON.parse(readFileSync(join(ROOT, "backup.json"), "utf8"));
      checks.push({ name: "backup.json", ok: true, detail: "valid JSON" });
    } catch {
      checks.push({ name: "backup.json", ok: false, detail: "invalid JSON" });
    }
  }

  if (json) {
    process.stdout.write(`${JSON.stringify(checks, null, 2)}\n`);
    return;
  }
  for (const check of checks) {
    const mark = check.ok === null ? "!" : check.ok ? "ok" : "missing";
    process.stdout.write(`${mark.padEnd(8)} ${check.name.padEnd(24)} ${check.detail}\n`);
  }
  if (!commandExists("restic")) process.stdout.write("\nInstall restic for version history: brew install restic, apt install restic, winget install restic, or scoop install restic.\n");
  if (!commandExists("sqlite3") && !sqlite) process.stdout.write("Install sqlite3 or use Node 22+ for session search in Codex, OpenCode, and Antigravity.\n");
}

export function runDoctor(args: string[]): void {
  try { doctor(args.includes("--json")); }
  catch (error) {
    process.stderr.write(`agent-memory doctor: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) runDoctor(process.argv.slice(2));
