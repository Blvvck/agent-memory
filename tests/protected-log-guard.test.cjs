const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const { guardPayload } = require("../dist/protected-log-guard.js");

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
