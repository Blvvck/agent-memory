const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const root = join(__dirname, "..");

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), "agent-wake-"));
  const body = join(home, ".agent-memory", "agents", "luna");
  mkdirSync(join(body, "brain"), { recursive: true });
  for (const file of ["soul.md", "work.md", "heart.md", "brain/worldview.md", "brain/memory.md", "brain/learnings.md", "brain/patterns.md"]) {
    writeFileSync(join(body, file), `# ${file}\n`);
  }
  mkdirSync(join(home, "project"), { recursive: true });
  return { home, project: join(home, "project") };
}

function wake(message, home, project) {
  const result = spawnSync(process.execPath, [join(root, "dist", "hooks", "harnesses", "claude-code", "wake.js")], {
    input: JSON.stringify({ prompt: message, cwd: project }),
    encoding: "utf8",
    env: { ...process.env, HOME: home, USERPROFILE: home, HOMEDRIVE: "", HOMEPATH: "" },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("wake lists the human profile and preferences", () => {
  const { home, project } = makeHome();
  try {
    mkdirSync(join(home, ".agent-memory", "human"), { recursive: true });
    writeFileSync(join(home, ".agent-memory", "human", "profile.md"), "# Profile\n", "utf8");
    writeFileSync(join(home, ".agent-memory", "human", "preferences.md"), "# Preferences\n", "utf8");
    const output = wake("hey luna", home, project);
    assert.match(output, /human\/profile\.md/);
    assert.match(output, /human\/preferences\.md/);
    rmSync(join(home, ".agent-memory", "human", "preferences.md"));
    assert.doesNotMatch(wake("hey luna", home, project), /human\/preferences\.md/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("WAKE.md references stay inside the agent and memory roots", () => {
  const { home, project } = makeHome();
  try {
    const body = join(home, ".agent-memory", "agents", "luna");
    writeFileSync(join(home, "secret.txt"), "secret\n", "utf8");
    symlinkSync(join(home, "secret.txt"), join(body, "escape.md"));
    writeFileSync(join(body, "WAKE.md"), [
      "Read core/expertise.md first.",
      "Also read ../../../etc/passwd and ~/.ssh/id_rsa.",
      "And read escape.md.",
    ].join("\n"), "utf8");
    const output = wake("hey luna", home, project);
    assert.match(output, /core\/expertise\.md/);
    assert.doesNotMatch(output, /etc\/passwd|\/\.ssh\/|id_rsa|escape\.md/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("named agents wake from a direct address or an explicit mention", () => {
  const { home, project } = makeHome();
  try {
    assert.match(wake("hey luna", home, project), /\[WAKE PROTOCOL for Luna\]/);
    assert.match(wake("@luna please review this", home, project), /\[WAKE PROTOCOL for Luna\]/);
    assert.match(wake("can you ask luna to review this?", home, project), /\[WAKE PROTOCOL for Luna\]/);
    assert.match(wake("Luna, take the next step", home, project), /\[WAKE PROTOCOL for Luna\]/);
    assert.match(wake("I saw a luna moth", home, project), /^$/);
    const legacy = spawnSync(process.execPath, [join(root, "dist", "hooks", "harnesses", "claude-code", "wake.js")], {
      input: JSON.stringify({ message: "hey luna", cwd: project }),
      encoding: "utf8",
      env: { ...process.env, HOME: home, USERPROFILE: home, HOMEDRIVE: "", HOMEPATH: "" },
    });
    assert.match(legacy.stdout, /\[WAKE PROTOCOL for Luna\]/, "a plain message field still wakes the body");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
