const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const root = join(__dirname, "..");

function setup() {
  const home = mkdtempSync(join(tmpdir(), "agent-init-"));
  const project = join(home, "project");
  mkdirSync(project, { recursive: true });
  writeFileSync(join(project, "package.json"), '{"name":"init-proof"}\n', "utf8");
  return { home, project };
}

function init(home, project, args) {
  return spawnSync(process.execPath, [join(root, "dist", "init.js"), "--project", "--yes", ...args], {
    cwd: project,
    encoding: "utf8",
    env: { ...process.env, HOME: home, USERPROFILE: home, HOMEDRIVE: "", HOMEPATH: "" },
  });
}

test("setup can run twice on the same project", () => {
  const { home, project } = setup();
  try {
    const first = init(home, project, []);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const marker = join(project, ".agent-memory-layout");
    assert.equal(readFileSync(marker, "utf8").trim(), ".agent-memory");
    const second = init(home, project, []);
    assert.equal(second.status, 0, second.stderr || second.stdout);
    assert.match(second.stdout, /Existing files stay in place/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("codex hooks land where codex reads them", () => {
  const { home, project } = setup();
  try {
    const run = init(home, project, ["--harness", "codex"]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.ok(existsSync(join(home, ".codex", "hooks.json")), "user-level hooks missing");
    assert.ok(!existsSync(join(project, ".codex", "hooks.json")), "project-level hooks were written");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a non-default layout marker survives a second run", () => {
  const { home, project } = setup();
  try {
    const first = init(home, project, ["--layout", "claude"]);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(readFileSync(join(project, ".agent-memory-layout"), "utf8").trim(), ".claude");
    const second = init(home, project, []);
    assert.equal(second.status, 0, second.stderr || second.stdout);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
