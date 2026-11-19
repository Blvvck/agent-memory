const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const root = join(__dirname, "..");

function setup() {
  const home = mkdtempSync(join(tmpdir(), "agent-human-import-"));
  const source = join(home, "user.md");
  writeFileSync(source, "# About me\n\nI prefer short answers.\n", "utf8");
  return { home, source };
}

function run(home, args) {
  return spawnSync(process.execPath, [join(root, "dist", "init.js"), "human", ...args], {
    encoding: "utf8",
    cwd: home,
    env: { ...process.env, HOME: home, USERPROFILE: home, HOMEDRIVE: "", HOMEPATH: "" },
  });
}

test("import copies the source once and leaves it unchanged", () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    const first = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.ok(existsSync(destination));
    const imported = readFileSync(destination, "utf8");
    assert.match(imported, /I prefer short answers/);
    assert.ok(imported.includes("imported from "), "import marker missing");
    assert.ok(imported.includes("user.md"), "source path missing from the marker");
    assert.equal(readFileSync(source, "utf8"), "# About me\n\nI prefer short answers.\n");

    const second = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(second.status, 0);
    assert.match(second.stdout, /Already imported/);
    assert.equal(readFileSync(destination, "utf8").match(/I prefer short answers/g).length, 1);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("import writes nothing without --yes", () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    const result = run(home, ["import", "--from", source]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Nothing written/);
    assert.ok(!existsSync(destination));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
