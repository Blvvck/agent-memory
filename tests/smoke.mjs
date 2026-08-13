#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = mkdtempSync(join(tmpdir(), "agent-memory-smoke-"));
const project = join(home, "project");
mkdirSync(project, { recursive: true });
const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  XDG_DATA_HOME: join(home, ".local", "share"),
  CODEX_HOME: join(home, ".codex"),
  CLAUDE_CONFIG_DIR: join(home, ".claude"),
  NODE_ENV: "test",
};
if (!env.PATH && env.Path) env.PATH = env.Path;

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [join(repo, "dist", "init.js"), ...args], {
    cwd: options.cwd ?? project,
    env,
    encoding: "utf8",
    timeout: options.timeout ?? 120_000,
  });
  if (result.status !== 0) {
    throw new Error(`command failed: ${args.join(" ")}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
  return result.stdout ?? "";
}

function check(condition, message) {
  if (!condition) throw new Error(`check failed: ${message}`);
}

function runFailure(args, options = {}) {
  const result = spawnSync(process.execPath, [join(repo, "dist", "init.js"), ...args], {
    cwd: options.cwd ?? project,
    env,
    encoding: "utf8",
    timeout: options.timeout ?? 120_000,
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function findNamed(root, name) {
  const stack = [root];
  for (let depth = 0; depth < 16 && stack.length; depth++) {
    const next = [];
    for (const directory of stack) {
      let entries;
      try { entries = readdirSync(directory, { withFileTypes: true }); }
      catch { continue; }
      for (const entry of entries) {
        if (entry.isDirectory()) next.push(join(directory, entry.name));
        else if (entry.name === name) return join(directory, entry.name);
      }
    }
    stack.splice(0, stack.length, ...next);
  }
  return null;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function resticRun(args) {
  return spawnSync("restic", [
    "--repo", join(home, ".agent-memory", "backup", "repo"),
    "--password-file", join(home, ".agent-memory", "backup", "password"),
    ...args,
  ], { env, encoding: "utf8", timeout: 120_000 });
}

function sqlite(db, sql) {
  mkdirSync(dirname(db), { recursive: true });
  const result = spawnSync("sqlite3", [db, sql], { env, encoding: "utf8", timeout: 60_000 });
  check(result.status === 0, `sqlite fixture failed: ${result.stderr}`);
}

try {
  spawnSync("git", ["init", "-q", "."], { cwd: project, env, encoding: "utf8" });

  const init = run(["--project", "--layout", "standard", "--yes"]);
  check(init.includes("Project memory"), "init did not create project memory");
  check(existsSync(join(project, ".agent-memory", "CONTEXT.md")), "CONTEXT.md missing");
  check(existsSync(join(home, ".agent-memory", "AGENTS.md")), "global AGENTS.md missing");

  const doctor = run(["doctor"]);
  const doctorLine = (name) => doctor.split("\n").find((line) => line.includes(` ${name} `)) ?? "";
  check(doctorLine("restic").trimStart().startsWith("ok"), "restic is not available");
  if (process.platform !== "win32") check(doctorLine("symlinks").trimStart().startsWith("ok"), "symlinks check failed");

  run(["--global-only", "--harness", "claude", "--yes"]);
  check(existsSync(join(home, ".claude", "CLAUDE.md")), "Claude import file missing");
  check(readFileSync(join(home, ".claude", "CLAUDE.md"), "utf8").includes("AGENTS.md"), "Claude import does not reference AGENTS.md");
  run(["--global-only", "--harness", "codex", "--yes"]);

  if (process.platform === "win32") {
    const bin = join(home, "bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "fake-claude.cmd"), "@echo off\r\necho fake-claude %*\r\n", "utf8");
    writeFileSync(join(home, ".agent-memory", "scheduler.json"), JSON.stringify({
      runners: { claude: ["fake-claude.cmd", "{prompt}"] },
    }, null, 2), "utf8");
    env.PATH = `${bin};${env.PATH ?? ""}`;
    env.Path = env.PATH;
    const at = new Date(Date.now() + 3_600_000).toISOString();
    run(["crons", "add", "--agent", "winrunner", "--at", at, "--note", "win shim", "--runner", "claude", "--as-human"]);
    const winCron = JSON.parse(run(["crons", "list", "--json"])).find((cron) => cron.agent === "winrunner");
    check(Boolean(winCron), "Windows shim cron not listed");
    const winOutput = run(["crons", "run", winCron.id]);
    check(winOutput.includes("fake-claude"), "Windows .cmd runner override did not execute");
    const trapAt = new Date(Date.now() + 3_600_000).toISOString();
    run(["crons", "add", "--agent", "wintrap", "--at", trapAt, "--note", "safe & echo HACKED", "--runner", "claude", "--as-human"]);
    const trap = JSON.parse(run(["crons", "list", "--json"])).find((cron) => cron.agent === "wintrap");
    const trapAttempt = runFailure(["crons", "run", trap.id]);
    check(trapAttempt.status !== 0, "Windows .cmd runner accepted shell metacharacters");
    check(!trapAttempt.stdout.includes("HACKED"), "Windows .cmd runner executed an injected command");
    const passwordAcl = spawnSync("icacls", [join(home, ".agent-memory", "backup", "password")], { encoding: "utf8" });
    check(!/BUILTIN\\Users:\(R\)|Everyone:\(R\)/.test(passwordAcl.stdout ?? ""), "backup password ACL is too broad");
    for (const runner of ["claude", "codex", "opencode"]) {
      const probe = run(["crons", "probe", runner]);
      check(probe.trim().length > 0, `real ${runner} shim did not run through the resolver`);
    }
    const longAt = new Date(Date.now() + 3_600_000).toISOString();
    run(["crons", "add", "--agent", "winlong", "--at", longAt, "--note", "x".repeat(9_000), "--runner", "claude", "--as-human"]);
    const winlong = JSON.parse(run(["crons", "list", "--json"])).find((cron) => cron.agent === "winlong");
    const longAttempt = runFailure(["crons", "run", winlong.id]);
    check(longAttempt.status !== 0 && longAttempt.stderr.includes("too long"), "oversized Windows .cmd command was not rejected");
  }

  const at = new Date(Date.now() + 3_600_000).toISOString();
  run(["crons", "add", "--agent", "smoke", "--at", at, "--note", "smoke run", "--exec", "node", "--arg", "-e", "--arg", "console.log('cron-ok')", "--as-human"]);
  const crons = JSON.parse(run(["crons", "list", "--json"])).filter((cron) => cron.agent === "smoke");
  check(crons.length === 1, "cron not listed");
  const cronOutput = run(["crons", "run", crons[0].id]);
  check(cronOutput.includes("cron-ok"), "cron command did not execute");
  const logLines = run(["crons", "logs", "--limit", "1"]).trim().split("\n").filter(Boolean);
  check(logLines.length === 1, "crons logs --limit was ignored");
  run(["crons", "add", "--agent", "pauseable", "--cron", "0 0 1 1 *", "--note", "paused run", "--exec", "node", "--arg", "-e", "--arg", "console.log('paused')", "--as-human"]);
  const pauseable = JSON.parse(run(["crons", "list", "--json"])).find((cron) => cron.agent === "pauseable");
  run(["crons", "pause", pauseable.id]);
  check(runFailure(["crons", "run", pauseable.id]).status !== 0, "paused cron ran");
  run(["crons", "resume", pauseable.id]);

  const pendingAt = new Date(Date.now() + 3_600_000).toISOString();
  run(["crons", "add", "--agent", "pending", "--at", pendingAt, "--note", "pending run", "--exec", "node", "--arg", "-e", "--arg", "console.log('pending-ran')"]);
  const pending = JSON.parse(run(["crons", "list", "--json"])).find((cron) => cron.agent === "pending");
  check(pending?.status === "pending-approval", "agent-created cron did not require approval");
  const pendingAttempt = runFailure(["crons", "run", pending.id]);
  check(pendingAttempt.status !== 0, "pending cron ran without approval");
  check(!pendingAttempt.stdout.includes("pending-ran"), "pending cron executed its command");
  const sessionStart = spawnSync(process.execPath, [join(repo, "dist", "hooks", "core", "dispatch.js")], {
    cwd: project,
    env: { ...env, AGENT_HOOK_SOURCE: "claude" },
    input: JSON.stringify({ hook_event_name: "SessionStart", session_id: "smoke", cwd: project }),
    encoding: "utf8",
  });
  check(sessionStart.stdout.includes("await approval"), "pending cron was not surfaced at session start");

  run(["crons", "add", "--agent", "leap", "--cron", "0 0 29 2 *", "--note", "leap day", "--exec", "node", "--arg", "-e", "--arg", "console.log('leap')", "--as-human"]);
  check(JSON.parse(run(["crons", "list", "--json"])).some((cron) => cron.agent === "leap"), "leap-day schedule was rejected");
  const impossible = runFailure(["crons", "add", "--agent", "impossible", "--cron", "0 0 30 2 *", "--note", "never", "--exec", "node", "--arg", "-e", "--arg", "console.log('never')", "--as-human"]);
  check(impossible.status !== 0 && impossible.stderr.includes("never occurs"), "impossible date was accepted");

  run(["crons", "add", "--agent", "stale", "--cron", "0 0 1 1 *", "--note", "stale run", "--exec", "node", "--arg", "-e", "--arg", "console.log('stale-ok')", "--as-human"]);
  const cronRegistry = join(home, ".agent-memory", "crons.json");
  const registry = readJson(cronRegistry);
  const stale = registry.crons.find((cron) => cron.agent === "stale");
  stale.status = "running";
  stale.runningSince = new Date(Date.now() - 3_600_000).toISOString();
  stale.nextRun = new Date(Date.now() - 60_000).toISOString();
  writeJson(cronRegistry, registry);
  run(["crons", "daemon", "--once"]);
  check(readJson(cronRegistry).crons.find((cron) => cron.id === stale.id)?.status === "active", "stale running cron was not persisted as active");
  const staleRun = run(["crons", "daemon", "--once"]);
  check(staleRun.includes("stale-ok"), "recovered stale cron did not run");

  const sessionDirectory = join(home, ".claude", "projects", "-smoke-project");
  mkdirSync(sessionDirectory, { recursive: true });
  writeFileSync(join(sessionDirectory, "session.jsonl"), [
    JSON.stringify({ type: "user", message: { role: "user", content: "smoke session hello" } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "smoke session reply" }] } }),
  ].join("\n"), "utf8");
  const sessions = run(["sessions", "--search", "smoke session", "--harness", "claude", "--limit", "2"]);
  check(sessions.includes("smoke session hello"), "session search did not find the fixture");

  const now = Date.now();
  sqlite(join(home, ".codex", "thread_history_1.sqlite"), `
    CREATE TABLE thread_turns (thread_id TEXT, turn_id TEXT, started_at INTEGER, completed_at INTEGER);
    CREATE TABLE thread_items (thread_id TEXT, turn_id TEXT, item_id TEXT, created_at_ms INTEGER, item_json TEXT, item_type TEXT);
    INSERT INTO thread_turns VALUES ('t1', 'turn1', ${now}, ${now});
    INSERT INTO thread_items VALUES ('t1', 'turn1', 'i1', ${now - 1000}, '{"content":[{"type":"text","text":"codex smoke hello"}]}', 'userMessage');
    INSERT INTO thread_items VALUES ('t1', 'turn1', 'i2', ${now}, '{"text":"codex smoke reply"}', 'agentMessage');
  `);
  check(run(["sessions", "--harness", "codex", "--search", "codex smoke", "--limit", "2"]).includes("codex smoke hello"), "Codex session adapter failed");

  sqlite(join(home, ".local", "share", "opencode", "opencode.db"), `
    CREATE TABLE session (id TEXT, title TEXT, directory TEXT, time_created INTEGER, time_updated INTEGER);
    CREATE TABLE message (id TEXT, session_id TEXT, data TEXT, time_created INTEGER);
    CREATE TABLE part (id TEXT, message_id TEXT, session_id TEXT, data TEXT, time_created INTEGER);
    INSERT INTO session VALUES ('s1', 'opencode smoke title', '/tmp/project', ${now}, ${now});
    INSERT INTO message VALUES ('m1', 's1', '{"role":"user"}', ${now});
    INSERT INTO part VALUES ('p1', 'm1', 's1', '{"type":"text","text":"opencode smoke hello"}', ${now});
  `);
  check(run(["sessions", "--harness", "opencode", "--search", "opencode smoke", "--limit", "2"]).includes("opencode smoke hello"), "OpenCode session adapter failed");

  sqlite(join(home, ".gemini", "antigravity-cli", "conversation_summaries.db"), `
    CREATE TABLE conversation_summaries (conversation_id TEXT, title TEXT, preview TEXT, last_modified_time TEXT, workspace_uris TEXT);
    INSERT INTO conversation_summaries VALUES ('a1', 'antigravity smoke title', 'antigravity smoke preview', '2026-11-18T00:00:00Z', 'file:///tmp');
  `);
  check(run(["sessions", "--harness", "antigravity", "--search", "antigravity smoke", "--limit", "2"]).includes("antigravity smoke"), "Antigravity session adapter failed");

  const cursorDb = process.platform === "win32"
    ? join(env.APPDATA || join(home, "AppData", "Roaming"), "Cursor", "User", "globalStorage", "state.vscdb")
    : process.platform === "darwin"
      ? join(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb")
      : join(home, ".config", "Cursor", "User", "globalStorage", "state.vscdb");
  sqlite(cursorDb, `
    CREATE TABLE cursorDiskKV (key TEXT, value TEXT);
    INSERT INTO cursorDiskKV VALUES ('composerData:c1', '{"text":"cursor smoke hello"}');
  `);
  check(run(["sessions", "--harness", "cursor", "--search", "cursor smoke", "--limit", "2"]).includes("cursor smoke hello"), "Cursor session adapter failed");

  const status = run(["backup", "status"]);
  check(status.includes("restic: restic"), "restic is not installed");
  const restoreMarker = join(home, ".agent-memory", "restore-marker.txt");
  writeFileSync(restoreMarker, "old\n", "utf8");
  run(["backup", "snapshot", "--scope", "global"]);
  const snapshots = JSON.parse(run(["backup", "list", "--scope", "global", "--json"]));
  check(snapshots.length >= 1, "no backup snapshot was listed");
  const restoreTarget = join(home, "restore");
  const restored = run(["backup", "restore", "--latest", "--to", restoreTarget]);
  check(restored.includes("[backup] restored"), "restore did not report a snapshot");
  check(findNamed(restoreTarget, "AGENTS.md") !== null, "restored AGENTS.md not found");
  check(existsSync(join(home, ".agent-memory", "AGENTS.md")), "global AGENTS.md vanished during smoke");

  const markerSnapshot = snapshots[snapshots.length - 1];
  writeFileSync(restoreMarker, "current\n", "utf8");
  env.AGENT_MEMORY_TEST_FAIL_SNAPSHOT = "1";
  const failedRestore = runFailure(["backup", "restore", markerSnapshot.short_id, "--in-place", "--yes"]);
  delete env.AGENT_MEMORY_TEST_FAIL_SNAPSHOT;
  check(failedRestore.status !== 0, "in-place restore continued without a safety snapshot");
  check(readFileSync(restoreMarker, "utf8").trim() === "current", "failed safety snapshot still overwrote live memory");
  run(["backup", "restore", markerSnapshot.short_id, "--in-place", "--yes"]);
  check(readFileSync(restoreMarker, "utf8").trim() === "old", "successful in-place restore did not apply the snapshot");

  const pruneDir = join(home, "outside-prune");
  mkdirSync(pruneDir, { recursive: true });
  writeFileSync(join(pruneDir, "keep.txt"), "keep\n", "utf8");
  check(resticRun(["backup", "--tag", "other", pruneDir]).status === 0, "external restic snapshot failed");
  run(["backup", "prune"]);
  const otherSnapshots = JSON.parse(resticRun(["snapshots", "--json", "--tag", "other"]).stdout ?? "[]");
  check(otherSnapshots.length === 1, "prune removed an unrelated snapshot");

  const scopeDir = join(home, "outside-scope");
  mkdirSync(scopeDir, { recursive: true });
  writeFileSync(join(scopeDir, "foreign.txt"), "foreign\n", "utf8");
  check(resticRun(["backup", "--tag", "agent-memory", scopeDir]).status === 0, "external scope snapshot failed");
  const allSnapshots = JSON.parse(resticRun(["snapshots", "--json"]).stdout ?? "[]");
  const outside = allSnapshots.find((snapshot) => snapshot.paths?.some((path) => path.includes("outside-scope")));
  check(Boolean(outside), "external scope snapshot not found");
  const scopeReject = runFailure(["backup", "restore", outside.short_id, "--in-place", "--yes"]);
  check(scopeReject.status !== 0, "in-place restore outside scope was allowed");
  check(scopeReject.stderr.includes("outside the Agent Memory scope"), "in-place restore refusal did not name the scope");

  const beforeLifecycle = JSON.parse(run(["backup", "list", "--json"])).length;
  const hookStarted = Date.now();
  spawnSync(process.execPath, [join(repo, "dist", "hooks", "core", "dispatch.js")], {
    cwd: project,
    env: { ...env, AGENT_HOOK_SOURCE: "claude" },
    input: JSON.stringify({ hook_event_name: "SessionEnd", session_id: "smoke", cwd: project }),
    encoding: "utf8",
  });
  check(Date.now() - hookStarted < 5_000, "SessionEnd hook blocked on a snapshot");
  let afterLifecycle = beforeLifecycle;
  for (let attempt = 0; attempt < 20; attempt++) {
    wait(500);
    afterLifecycle = JSON.parse(run(["backup", "list", "--json"])).length;
    if (afterLifecycle > beforeLifecycle) break;
  }
  check(afterLifecycle > beforeLifecycle, "detached lifecycle snapshot did not run");

  const customBackup = join(home, "custom-backup");
  writeJson(join(home, ".agent-memory", "backup.json"), {
    repo: join(customBackup, "repo"),
    passwordFile: join(customBackup, "password"),
  });
  run(["backup", "snapshot", "--scope", "global"]);
  check(run(["backup", "status"]).includes(join(customBackup, "repo")), "backup status ignored custom repo");
  check(run(["doctor"]).includes(join(customBackup, "repo")), "doctor ignored custom repo");

  process.stdout.write(`Smoke passed on ${process.platform} ${process.arch} Node ${process.version}\n`);
} finally {
  try { rmSync(home, { recursive: true, force: true }); }
  catch { /* best effort */ }
}
