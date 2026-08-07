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

  const sessionDirectory = join(home, ".claude", "projects", "-smoke-project");
  mkdirSync(sessionDirectory, { recursive: true });
  writeFileSync(join(sessionDirectory, "session.jsonl"), [
    JSON.stringify({ type: "user", message: { role: "user", content: "smoke session hello" } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "smoke session reply" }] } }),
  ].join("\n"), "utf8");
  const sessions = run(["sessions", "--search", "smoke session", "--harness", "claude", "--limit", "2"]);
  check(sessions.includes("smoke session hello"), "session search did not find the fixture");

  const status = run(["backup", "status"]);
  check(status.includes("restic: restic"), "restic is not installed");
  run(["backup", "snapshot", "--scope", "global"]);
  const snapshots = JSON.parse(run(["backup", "list", "--scope", "global", "--json"]));
  check(snapshots.length >= 1, "no backup snapshot was listed");
  const restoreTarget = join(home, "restore");
  const restored = run(["backup", "restore", "--latest", "--to", restoreTarget]);
  check(restored.includes("[backup] restored"), "restore did not report a snapshot");
  check(findNamed(restoreTarget, "AGENTS.md") !== null, "restored AGENTS.md not found");
  check(existsSync(join(home, ".agent-memory", "AGENTS.md")), "global AGENTS.md vanished during smoke");

  process.stdout.write(`Smoke passed on ${process.platform} ${process.arch} Node ${process.version}\n`);
} finally {
  try { rmSync(home, { recursive: true, force: true }); }
  catch { /* best effort */ }
}
