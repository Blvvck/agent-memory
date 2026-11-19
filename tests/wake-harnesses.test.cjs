const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const root = join(__dirname, "..");

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), "agent-wake-harness-"));
  const body = join(home, ".agent-memory", "agents", "luna");
  mkdirSync(join(body, "brain"), { recursive: true });
  for (const file of ["soul.md", "work.md", "heart.md", "brain/worldview.md", "brain/memory.md", "brain/learnings.md", "brain/patterns.md"]) {
    writeFileSync(join(body, file), `# ${file}\n`);
  }
  const project = join(home, "project");
  mkdirSync(project, { recursive: true });
  return { home, project };
}

function environment(home) {
  return { ...process.env, HOME: home, USERPROFILE: home, HOMEDRIVE: "", HOMEPATH: "" };
}

function runDispatch(harness, payload, home) {
  const result = spawnSync(process.execPath, [join(root, "dist", "hooks", "harnesses", harness, "dispatch.js")], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: environment(home),
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("Codex injects the wake protocol on a prompt", () => {
  const { home, project } = makeHome();
  try {
    const output = runDispatch("codex", {
      hook_event_name: "UserPromptSubmit",
      session_id: "codex-boot",
      cwd: project,
      prompt: "hey luna",
    }, home);
    const parsed = JSON.parse(output);
    assert.match(parsed.hookSpecificOutput.additionalContext, /\[WAKE PROTOCOL for Luna\]/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("Cursor surfaces the wake protocol on a submitted prompt", () => {
  const { home, project } = makeHome();
  try {
    const output = runDispatch("cursor", {
      hook_event_name: "beforeSubmitPrompt",
      conversation_id: "cursor-boot",
      cwd: project,
      prompt: "hey luna",
    }, home);
    const parsed = JSON.parse(output);
    assert.equal(parsed.continue, true);
    assert.match(parsed.user_message, /\[WAKE PROTOCOL for Luna\]/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("Antigravity injects the wake protocol on the first invocation", () => {
  const { home, project } = makeHome();
  try {
    const output = runDispatch("antigravity", {
      invocationNum: 1,
      conversationId: "antigravity-boot",
      workspacePaths: [project],
      parts: [{ text: "hey luna" }],
    }, home);
    const parsed = JSON.parse(output);
    const injected = parsed.injectSteps.map((step) => step.ephemeralMessage).join("\n");
    assert.match(injected, /\[WAKE PROTOCOL for Luna\]/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("Antigravity blocks a direct write to a protected log", () => {
  const { home, project } = makeHome();
  try {
    const target = join(project, ".agent-memory", "agents", "Proof", "brain", "memory.md");
    mkdirSync(join(project, ".agent-memory", "agents", "Proof", "brain"), { recursive: true });
    writeFileSync(target, "# memory\n\n## Work Log\n\nEntries start here.\n", "utf8");
    const output = runDispatch("antigravity", {
      hook_event_name: "PreToolUse",
      conversationId: "antigravity-guard",
      workspacePaths: [project],
      toolCall: { name: "write_file", args: { TargetFile: target, CodeContent: "overwrite" } },
    }, home);
    const parsed = JSON.parse(output);
    assert.equal(parsed.decision, "deny");
    assert.match(parsed.reason, /protected/i);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("OpenCode plugin exports the module shape OpenCode loads", () => {
  const plugin = require("../dist/hooks/harnesses/opencode/plugin.js");
  assert.equal(plugin.default.id, "agent-memory");
  assert.equal(typeof plugin.default.server, "function");
});

test("OpenCode returns the wake protocol for the prompt hook", () => {
  const { home, project } = makeHome();
  try {
    const script = [
      "const { dispatchHook } = require(process.argv[1]);",
      "const result = dispatchHook('UserPromptSubmit', { session_id: 'opencode-boot', cwd: process.argv[2], prompt: 'hey luna' });",
      "process.stdout.write(JSON.stringify(result));",
    ].join("\n");
    const result = spawnSync(process.execPath, ["-e", script, join(root, "dist", "hooks", "harnesses", "opencode", "dispatch.js"), project], {
      encoding: "utf8",
      env: environment(home),
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(JSON.parse(result.stdout).contexts.join("\n"), /\[WAKE PROTOCOL for Luna\]/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
