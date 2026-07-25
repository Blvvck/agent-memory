const assert = require("node:assert/strict");
const { test } = require("node:test");
const { guardPayload } = require("../dist/protected-log-guard.js");

const memoryPath = ".agent-memory/agents/example/brain/memory.md";

function bashPayload(command) {
  return {
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command, cwd: "/tmp/project" },
  };
}

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
