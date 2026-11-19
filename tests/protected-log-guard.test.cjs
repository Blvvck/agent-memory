const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { guardPayload } = require("../dist/protected-log-guard.js");
const { canonicalProtectedLogPath } = require("../dist/protected-log.js");

const script = join(__dirname, "..", "dist", "protected-log-guard.js");
const cwd = "/tmp/ag-guard-project";

const memoryPath = ".agent-memory/agents/example/brain/memory.md";

function bashPayload(command) {
  return {
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command, cwd: "/tmp/project" },
  };
}

test("a project reached through a symlink still has a canonical memory path", () => {
  const real = mkdtempSync(join(tmpdir(), "agent-symlink-"));
  try {
    const project = join(real, "project");
    const brain = join(project, ".agent-memory", "agents", "Proof", "brain");
    mkdirSync(brain, { recursive: true });
    writeFileSync(join(project, ".agent-memory-layout"), ".agent-memory\n");
    writeFileSync(join(brain, "memory.md"), "# memory\n\n## Work Log\n\n", "utf8");
    spawnSync("git", ["init", "-q", "."], { cwd: project });
    const link = join(real, "link");
    symlinkSync(project, link);
    assert.doesNotThrow(() => canonicalProtectedLogPath(join(link, ".agent-memory", "agents", "Proof", "brain", "memory.md")));
  } finally {
    rmSync(real, { recursive: true, force: true });
  }
});

test("only the installed writer is exempt, and never with a redirect", () => {
  const dir = mkdtempSync(join(tmpdir(), "agent-fake-writer-"));
  const installed = join(__dirname, "..", "dist", "agent-log.js");
  const target = join(cwd, memoryPath);
  const run = (command) => guardPayload({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command, cwd } });
  try {
    const fake = join(dir, "agent-log");
    writeFileSync(fake, "#!/bin/sh\ntrue\n", { mode: 0o755 });
    assert.match(run(`${fake} --file ${target}`), /Direct shell mutation/);

    const fakeNode = join(dir, "fake-agent-log.js");
    writeFileSync(fakeNode, "process.exit(0)\n");
    assert.match(run(`node ${fakeNode} --file ${target}`), /Direct shell mutation/);

    assert.equal(run(`node ${installed} --file ${target}`), null);
    assert.match(run(`node ${installed} --file ${target} > ${target}`), /Direct shell mutation/);
    assert.match(run(`echo x >> ${memoryPath}`), /Direct shell mutation/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the guard blocks as a subprocess, which is how non-Claude harnesses call it", () => {
  const blocked = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(cwd, memoryPath) }, cwd }),
    encoding: "utf8",
  });
  assert.equal(blocked.status, 0);
  const parsed = JSON.parse(blocked.stdout.trim());
  assert.equal(parsed.decision, "block");
  assert.match(parsed.reason, /protected|routing/i);

  const allowed = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: join(cwd, memoryPath) }, cwd }),
    encoding: "utf8",
  });
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stdout.trim(), "");

  const malformed = spawnSync(process.execPath, [script], { input: "not json", encoding: "utf8" });
  assert.equal(malformed.status, 0);
  assert.equal(JSON.parse(malformed.stdout.trim()).decision, "block");
});

test("index staging and read-only git inspection may name protected logs", () => {
  const commands = [
    `git add -- ${memoryPath}`,
    `git status --short -- ${memoryPath}`,
    `git diff -- ${memoryPath}`,
    `git log -- ${memoryPath}`,
    `git check-ignore -v ${memoryPath}`,
  ];

  for (const command of commands) assert.equal(guardPayload(bashPayload(command)), null, command);
});

test("git commands that can change protected file contents remain blocked", () => {
  const commands = [
    `git checkout -- ${memoryPath}`,
    `git restore --source=HEAD -- ${memoryPath}`,
    `git apply -- ${memoryPath}`,
  ];

  for (const command of commands) assert.match(guardPayload(bashPayload(command)), /Direct shell mutation/, command);
});

test("git output options that can write to a protected path remain blocked", () => {
  const command = `git diff --output=${memoryPath}`;
  assert.match(guardPayload(bashPayload(command)), /Direct shell mutation/);
});

test("shell redirection to a protected log remains blocked", () => {
  const command = `printf x > ${memoryPath}`;
  assert.match(guardPayload(bashPayload(command)), /Direct shell mutation/);
});
