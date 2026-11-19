const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
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
