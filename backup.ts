#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import { projectMemoryRoot } from "./memory-paths";

interface BackupConfig {
  enabled: boolean;
  repo: string;
  passwordFile: string;
  retention: { last: number; daily: number; weekly: number; monthly: number };
}

interface Snapshot {
  id: string;
  short_id: string;
  time: string;
  tags: string[];
  paths: string[];
  summary?: { files_new?: number; files_changed?: number; total_files_processed?: number; total_bytes_processed?: number };
}

interface ResticResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

const ROOT = join(homedir(), ".agent-memory");
const BACKUP_DIR = join(ROOT, "backup");
const DEFAULT_REPO = join(BACKUP_DIR, "repo");
const DEFAULT_PASSWORD = join(BACKUP_DIR, "password");
const CONFIG_FILE = join(ROOT, "backup.json");

const EXCLUDES = ["backup", "dist", "*.lock", "*.agent-memory-backup-*"];

function pathExists(path: string): boolean {
  try { statSync(path); return true; }
  catch { return false; }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function loadConfig(): BackupConfig {
  const defaults: BackupConfig = {
    enabled: true,
    repo: DEFAULT_REPO,
    passwordFile: DEFAULT_PASSWORD,
    retention: { last: 10, daily: 7, weekly: 4, monthly: 12 },
  };
  if (!pathExists(CONFIG_FILE)) return defaults;
  try {
    const parsed = asObject(JSON.parse(readFileSync(CONFIG_FILE, "utf8")));
    if (!parsed) return defaults;
    const retention = asObject(parsed.retention) ?? {};
    return {
      enabled: parsed.enabled !== false,
      repo: typeof parsed.repo === "string" ? parsed.repo : defaults.repo,
      passwordFile: typeof parsed.passwordFile === "string" ? parsed.passwordFile : defaults.passwordFile,
      retention: {
        last: typeof retention.last === "number" ? retention.last : defaults.retention.last,
        daily: typeof retention.daily === "number" ? retention.daily : defaults.retention.daily,
        weekly: typeof retention.weekly === "number" ? retention.weekly : defaults.retention.weekly,
        monthly: typeof retention.monthly === "number" ? retention.monthly : defaults.retention.monthly,
      },
    };
  } catch {
    return defaults;
  }
}

function resticAvailable(): boolean {
  return spawnSync("restic", ["version"], { encoding: "utf8" }).status === 0;
}

function resticVersion(): string {
  const result = spawnSync("restic", ["version"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.split("\n")[0].trim() : "";
}

function tightenPassword(path: string): void {
  if (process.platform !== "win32") return;
  const user = process.env.USERNAME;
  if (!user) return;
  try {
    spawnSync("icacls", [path, "/inheritance:r", "/grant:r", `${user}:F`], { encoding: "utf8" });
  } catch { /* best effort */ }
}

function ensurePassword(config: BackupConfig): void {
  if (pathExists(config.passwordFile)) {
    tightenPassword(config.passwordFile);
    return;
  }
  mkdirSync(resolve(config.passwordFile, ".."), { recursive: true });
  writeFileSync(config.passwordFile, `${randomBytes(32).toString("base64")}\n`, { encoding: "utf8", mode: 0o600 });
  try { chmodSync(config.passwordFile, 0o600); } catch { /* Windows ACLs differ */ }
  tightenPassword(config.passwordFile);
}

function runRestic(args: string[], timeout = 120_000): ResticResult {
  const config = loadConfig();
  ensurePassword(config);
  const result = spawnSync("restic", ["--repo", config.repo, "--password-file", config.passwordFile, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout,
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function repoReady(config: BackupConfig): boolean {
  return pathExists(join(config.repo, "config"));
}

function ensureBackupIgnore(): void {
  const file = join(ROOT, ".gitignore");
  const current = pathExists(file) ? readFileSync(file, "utf8") : "";
  if (current.split("\n").map((line) => line.trim()).includes("backup/")) return;
  writeFileSync(file, `${current.replace(/\s*$/, "")}${current.trim() ? "\n" : ""}backup/\n`, "utf8");
}

function ensureRepo(): { ok: boolean; message: string } {
  const config = loadConfig();
  if (!resticAvailable()) return { ok: false, message: "restic is not installed; version history is disabled." };
  if (!config.enabled) return { ok: false, message: "backups are disabled in backup.json." };
  ensurePassword(config);
  ensureBackupIgnore();
  if (repoReady(config)) return { ok: true, message: "" };
  mkdirSync(config.repo, { recursive: true });
  const result = runRestic(["init"]);
  if (result.status !== 0 && !/already initialized/i.test(result.stderr)) return { ok: false, message: result.stderr.trim() || "restic init failed." };
  return { ok: true, message: "" };
}

function scopePath(scope: "global" | "project"): string | null {
  if (scope === "global") return ROOT;
  try {
    const path = projectMemoryRoot(process.cwd());
    return resolve(path) !== resolve(ROOT) && pathExists(path) ? path : null;
  } catch {
    return null;
  }
}

function scopeTag(path: string): string {
  if (resolve(path) === resolve(ROOT)) return "global";
  return `project:${basename(resolve(path, ".."))}`;
}

function snapshot(path: string, quiet = false): boolean {
  // Test seam: proves in-place restore aborts when its safety snapshot fails. It can only refuse a snapshot.
  if (process.env.NODE_ENV === "test" && process.env.AGENT_MEMORY_TEST_FAIL_SNAPSHOT === "1") return false;
  const ready = ensureRepo();
  if (!ready.ok) {
    if (!quiet) process.stderr.write(`${ready.message}\n`);
    return false;
  }
  const args = ["backup", "--tag", "agent-memory", "--tag", scopeTag(path)];
  for (const exclude of EXCLUDES) args.push("--exclude", exclude);
  args.push(path);
  const result = runRestic(args, 60_000);
  if (!quiet) {
    if (result.status === 0) process.stdout.write(`[backup] snapshot ${scopeTag(path)} ${path}\n`);
    else process.stderr.write(`[backup] ${result.stderr.trim()}\n`);
  }
  return result.status === 0;
}

export function backupAvailable(): boolean {
  return resticAvailable();
}

function gitRootFor(path: string): string | null {
  if (!pathExists(path)) return null;
  const result = spawnSync("git", ["-C", path, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

export function scopeUsesGit(path: string): boolean {
  const root = gitRootFor(path);
  if (!root) return false;
  const marker = join(path, resolve(path) === resolve(ROOT) ? "AGENTS.md" : "CONTEXT.md");
  if (!pathExists(marker)) return false;
  const result = spawnSync("git", ["-C", root, "ls-files", "--error-unmatch", relative(root, marker)], { encoding: "utf8" });
  return result.status === 0;
}

export function snapshotScope(scope: "global" | "project", quiet = true): boolean {
  if (!resticAvailable()) return false;
  const path = scopePath(scope);
  return path && !scopeUsesGit(path) ? snapshot(path, quiet) : false;
}

export function backupConfigPaths(): { repo: string; passwordFile: string } {
  const config = loadConfig();
  return { repo: config.repo, passwordFile: config.passwordFile };
}

export function snapshotInBackground(cwd: string): void {
  if (!resticAvailable()) return;
  const child = spawn(process.execPath, [join(__dirname, "backup.js"), "snapshot", "--quiet"], {
    cwd,
    env: process.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export function snapshotScopeInBackground(scope: "global" | "project"): void {
  if (!resticAvailable()) return;
  const child = spawn(process.execPath, [join(__dirname, "backup.js"), "snapshot", "--scope", scope, "--quiet"], {
    env: process.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export function snapshotOnLifecycle(): void {
  if (!resticAvailable()) return;
  for (const scope of ["global", "project"] as const) {
    const path = scopePath(scope);
    if (!path || scopeUsesGit(path)) continue;
    try { snapshot(path, true); }
    catch { continue; }
  }
}

function parseSnapshots(json: string): Snapshot[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) return [];
  const snapshots: Snapshot[] = [];
  for (const item of parsed) {
    const object = asObject(item);
    if (!object || typeof object.short_id !== "string") continue;
    const tags = Array.isArray(object.tags) ? object.tags.filter((tag): tag is string => typeof tag === "string") : [];
    const paths = Array.isArray(object.paths) ? object.paths.filter((path): path is string => typeof path === "string") : [];
    const summary = asObject(object.summary);
    snapshots.push({
      id: typeof object.id === "string" ? object.id : object.short_id,
      short_id: object.short_id,
      time: typeof object.time === "string" ? object.time : "",
      tags,
      paths,
      summary: summary ? {
        files_new: typeof summary.files_new === "number" ? summary.files_new : undefined,
        files_changed: typeof summary.files_changed === "number" ? summary.files_changed : undefined,
        total_files_processed: typeof summary.total_files_processed === "number" ? summary.total_files_processed : undefined,
        total_bytes_processed: typeof summary.total_bytes_processed === "number" ? summary.total_bytes_processed : undefined,
      } : undefined,
    });
  }
  return snapshots.sort((a, b) => a.time.localeCompare(b.time));
}

function listSnapshots(scope?: "global" | "project"): Snapshot[] {
  if (!ensureRepo().ok) return [];
  const result = runRestic(["snapshots", "--json"]);
  if (result.status !== 0) return [];
  const snapshots = parseSnapshots(result.stdout).filter((item) => item.tags.includes("agent-memory"));
  if (!scope) return snapshots;
  if (scope === "global") return snapshots.filter((item) => item.tags.includes("global"));
  const projectPath = scopePath("project");
  if (!projectPath) return [];
  const projectTag = scopeTag(projectPath);
  return snapshots.filter((item) => item.tags.includes(projectTag));
}

function chooseSnapshot(all: Snapshot[], id?: string, latest?: boolean, before?: string): Snapshot | null {
  if (latest) return all.length ? all[all.length - 1] : null;
  if (before) {
    const cutoff = Date.parse(before);
    if (Number.isNaN(cutoff)) throw new Error(`Cannot read --before '${before}'.`);
    return [...all].reverse().find((item) => Date.parse(item.time) <= cutoff) ?? null;
  }
  if (!id) return all.length ? all[all.length - 1] : null;
  return all.find((item) => item.id === id || item.short_id === id || item.id.startsWith(id) || item.short_id.startsWith(id)) ?? null;
}

function restoreSnapshot(snapshotItem: Snapshot, target: string): string {
  mkdirSync(target, { recursive: true });
  const result = runRestic(["restore", snapshotItem.id, "--target", target], 120_000);
  if (result.status !== 0) throw new Error(result.stderr.trim() || "restore failed");
  const original = snapshotItem.paths[0] ?? "";
  const root = resolve(target);
  const direct = resolve(target, original.replace(/^[A-Za-z]:[\\/]|^[\\/]/, ""));
  if (!direct.startsWith(root + sep)) throw new Error("Snapshot path escapes the restore target.");
  if (pathExists(direct)) return direct;
  const wanted = basename(original);
  const stack = [root];
  for (let depth = 0; depth < 16 && stack.length; depth++) {
    const next: string[] = [];
    for (const directory of stack) {
      let entries;
      try { entries = readdirSync(directory, { withFileTypes: true }); }
      catch { continue; }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const child = join(directory, entry.name);
        if (entry.name === wanted) {
          const candidate = resolve(child);
          if (candidate.startsWith(root + sep)) return candidate;
        }
        next.push(child);
      }
    }
    stack.splice(0, stack.length, ...next);
  }
  return root;
}

function status(): void {
  const config = loadConfig();
  const available = resticAvailable();
  process.stdout.write(`restic: ${available ? resticVersion() : "not installed"}\n`);
  process.stdout.write(`repo: ${config.repo}${repoReady(config) ? "" : " (not initialized)"}\n`);
  process.stdout.write(`password: ${config.passwordFile}\n`);
  if (!available || !repoReady(config)) return;
  const snapshots = listSnapshots();
  process.stdout.write(`snapshots: ${snapshots.length}\n`);
  if (snapshots.length) {
    const last = snapshots[snapshots.length - 1];
    process.stdout.write(`latest: ${last.short_id} ${last.time} ${last.tags.join(",")}\n`);
  }
}

function printSnapshots(snapshots: Snapshot[], json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(snapshots, null, 2)}\n`);
    return;
  }
  if (!snapshots.length) {
    process.stdout.write("No snapshots.\n");
    return;
  }
  for (const item of snapshots) {
    process.stdout.write(`${item.short_id.padEnd(10)} ${item.time.slice(0, 16).replace("T", " ")}  ${item.tags.join(",").padEnd(24)} ${item.paths.join(" ")}\n`);
  }
}

function requireRestic(): boolean {
  if (resticAvailable()) return true;
  process.stderr.write("restic is not installed. Install it to enable version history.\n");
  return false;
}

function help(): string {
  return `agent-memory backup — version history, rollback, and restore

Usage:
  agent-memory backup status
  agent-memory backup snapshot [--scope global|project] [--quiet]
  agent-memory backup list [--scope global|project] [--limit N] [--json]
  agent-memory backup restore [<id>] [--latest|--before ISO] [--scope ...] [--to PATH] [--in-place --yes]
  agent-memory backup diff <id> <id>
  agent-memory backup prune

The repository, password, and retention live under ~/.agent-memory/backup.
`;
}

function main(): void {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return;
  }
  const scopeIndex = args.indexOf("--scope");
  const scopeValue = scopeIndex >= 0 ? args[scopeIndex + 1] : undefined;
  if (scopeValue && scopeValue !== "global" && scopeValue !== "project") throw new Error("--scope must be global or project.");
  const scope = scopeValue as "global" | "project" | undefined;
  const json = args.includes("--json");
  const quiet = args.includes("--quiet");

  if (command === "status") { status(); return; }
  if (command === "snapshot") {
    if (!requireRestic()) return;
    const scopes = scope ? [scope] : ["global", "project"] as const;
    for (const item of scopes) {
      const path = scopePath(item);
      if (path && !scopeUsesGit(path)) snapshot(path, quiet);
    }
    return;
  }
  if (command === "list" || command === "snapshots") {
    if (!requireRestic()) return;
    const limitIndex = args.indexOf("--limit");
    const limit = limitIndex >= 0 ? Math.max(1, Number(args[limitIndex + 1] ?? 20)) : 20;
    const snapshots = listSnapshots(scope).slice(-limit);
    printSnapshots(snapshots, json);
    return;
  }
  if (command === "restore" || command === "rollback" || command === "fast-forward") {
    if (!requireRestic()) return;
    const snapshots = listSnapshots(scope);
    if (!snapshots.length) throw new Error("No snapshots to restore.");
    const beforeIndex = args.indexOf("--before");
    const toIndex = args.indexOf("--to");
    const scopeIndexLocal = args.indexOf("--scope");
    const id = args.find((arg, index) => !arg.startsWith("-")
      && (beforeIndex < 0 || index !== beforeIndex + 1)
      && (toIndex < 0 || index !== toIndex + 1)
      && (scopeIndexLocal < 0 || index !== scopeIndexLocal + 1));
    const latest = command === "fast-forward" || args.includes("--latest");
    const before = beforeIndex >= 0 ? args[beforeIndex + 1] : undefined;
    const chosen = chooseSnapshot(snapshots, id, latest, before);
    if (!chosen) throw new Error("No matching snapshot.");
    const inPlace = args.includes("--in-place");
    const target = toIndex >= 0 ? resolve(args[toIndex + 1] ?? "") : join(tmpdir(), `agent-memory-restore-${chosen.short_id}`);
    const restored = restoreSnapshot(chosen, target);
    process.stdout.write(`[backup] restored ${chosen.short_id} to ${restored}\n`);
    if (inPlace) {
      if (!args.includes("--yes")) throw new Error("In-place restore requires --yes. Restore to a directory first to inspect it.");
      const original = chosen.paths[0];
      if (!original) throw new Error("Snapshot has no path to restore in place.");
      const allowedScopes = [resolve(ROOT), scopePath("project")].filter((path): path is string => Boolean(path)).map((path) => resolve(path));
      if (!allowedScopes.includes(resolve(original))) throw new Error("Refusing in-place restore outside the Agent Memory scope.");
      if (!snapshot(original, true)) throw new Error("Pre-restore snapshot failed; refusing to overwrite the live memory.");
      cpSync(restored, original, { recursive: true, force: true });
      process.stdout.write(`[backup] merged ${chosen.short_id} into ${original} (pre-restore snapshot taken)\n`);
    }
    return;
  }
  if (command === "diff") {
    if (!requireRestic()) return;
    const ids = args.filter((arg) => !arg.startsWith("-"));
    if (ids.length < 2) throw new Error("Provide two snapshot ids.");
    const result = runRestic(["diff", ids[0], ids[1]], 60_000);
    process.stdout.write(result.status === 0 ? result.stdout : result.stderr);
    return;
  }
  if (command === "prune") {
    if (!requireRestic()) return;
    const config = loadConfig();
    const result = runRestic([
      "forget",
      "--tag", "agent-memory",
      "--keep-last", String(config.retention.last),
      "--keep-daily", String(config.retention.daily),
      "--keep-weekly", String(config.retention.weekly),
      "--keep-monthly", String(config.retention.monthly),
      "--prune",
    ], 300_000);
    process.stdout.write(result.status === 0 ? result.stdout : result.stderr);
    return;
  }
  throw new Error(`Unknown command '${command}'.`);
}

export function runBackup(args: string[]): void {
  const previous = process.argv;
  process.argv = [previous[0], previous[1], ...args];
  try { main(); }
  catch (error) {
    process.stderr.write(`agent-memory backup: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  } finally {
    process.argv = previous;
  }
}

if (require.main === module) runBackup(process.argv.slice(2));
