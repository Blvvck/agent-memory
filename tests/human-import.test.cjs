const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const root = join(__dirname, "..");

function setup() {
  const home = mkdtempSync(join(tmpdir(), "agent-human-import-"));
  const source = join(home, "user.md");
  writeFileSync(source, "# About me\n\nI prefer short answers.\n", "utf8");
  return { home, source };
}

function env(home) {
  return { ...process.env, HOME: home, USERPROFILE: home, HOMEDRIVE: "", HOMEPATH: "" };
}

function run(home, args) {
  return spawnSync(process.execPath, [join(root, "dist", "init.js"), "human", ...args], {
    encoding: "utf8",
    cwd: home,
    env: env(home),
  });
}

function spawnAsync(home, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, "dist", "init.js"), "human", ...args], { cwd: home, env: env(home) });
    child.on("close", (code) => resolve(code));
  });
}

test("import copies the source once and leaves it unchanged", () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    const first = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const imported = readFileSync(destination, "utf8");
    assert.match(imported, /I prefer short answers/);
    assert.ok(imported.includes("imported from "), "import marker missing");
    assert.equal(readFileSync(source, "utf8"), "# About me\n\nI prefer short answers.\n");

    const second = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(second.status, 0);
    assert.match(second.stdout, /Already imported/);
    assert.equal(readFileSync(destination, "utf8").match(/I prefer short answers/g).length, 1);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a symlink to an imported source is not imported twice", () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  const link = join(home, "user-link.md");
  try {
    symlinkSync(source, link);
    assert.equal(run(home, ["import", "--from", source, "--yes"]).status, 0);
    const second = run(home, ["import", "--from", link, "--yes"]);
    assert.equal(second.status, 0);
    assert.match(second.stdout, /Already imported/);
    assert.equal(readFileSync(destination, "utf8").match(/I prefer short answers/g).length, 1);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("text that looks like an import marker does not block a real import", () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    mkdirSync(join(home, ".agent-memory", "human"), { recursive: true });
    writeFileSync(destination, `# Human — Profile\n\nimported from ${source}\n`, "utf8");
    const result = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Imported/);
    assert.equal(readFileSync(destination, "utf8").match(/I prefer short answers/g).length, 1);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("--from without a value fails instead of importing a discovered file", () => {
  const { home } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    const result = run(home, ["import", "--from", "--yes"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--from needs a path/);
    assert.ok(!existsSync(destination));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("planning leaves nothing under the human directory", () => {
  const { home, source } = setup();
  try {
    const plain = run(home, ["import", "--from", source]);
    assert.equal(plain.status, 0);
    const dry = run(home, ["import", "--from", source, "--dry-run"]);
    assert.equal(dry.status, 0);
    assert.ok(!existsSync(join(home, ".agent-memory", "human")), "human directory was created during planning");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a corrupt manifest fails without overwriting it", () => {
  const { home, source } = setup();
  const human = join(home, ".agent-memory", "human");
  const manifest = join(human, "imports.json");
  const destination = join(human, "profile.md");
  try {
    mkdirSync(human, { recursive: true });
    writeFileSync(manifest, "{ not json", "utf8");
    const result = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot read/);
    assert.equal(readFileSync(manifest, "utf8"), "{ not json");
    assert.ok(!existsSync(destination));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a directory source fails before the profile is created", () => {
  const { home } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    const result = run(home, ["import", "--from", home, "--yes"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not a file|Cannot read/);
    assert.ok(!existsSync(destination));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("imported facts land inside the wake slice", () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    assert.equal(run(home, ["import", "--from", source, "--yes"]).status, 0);
    const firstThirty = readFileSync(destination, "utf8").split("\n").slice(0, 30).join("\n");
    assert.match(firstThirty, /I prefer short answers/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a titleless profile gets a title and the import near the top", () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    mkdirSync(join(home, ".agent-memory", "human"), { recursive: true });
    const filler = Array.from({ length: 35 }, (_, index) => `Existing line ${index + 1}`).join("\n");
    writeFileSync(destination, `${filler}\n`, "utf8");
    assert.equal(run(home, ["import", "--from", source, "--yes"]).status, 0);
    const text = readFileSync(destination, "utf8");
    assert.ok(text.startsWith("# Human — Profile"), "title was not added");
    assert.match(text.split("\n").slice(0, 30).join("\n"), /I prefer short answers/);
    assert.match(text, /Existing line 35/);
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

test("a live requester blocks the import", () => {
  const { home, source } = setup();
  const queue = join(home, ".agent-memory", "human", ".import-queue");
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    mkdirSync(queue, { recursive: true });
    mkdirSync(join(queue, `0-${process.pid}-test`));
    const result = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Another import is running/);
    assert.ok(!existsSync(destination));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a dead requester is cleared", () => {
  const { home, source } = setup();
  const queue = join(home, ".agent-memory", "human", ".import-queue");
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    mkdirSync(queue, { recursive: true });
    mkdirSync(join(queue, "0-2147483647-test"));
    const result = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(readFileSync(destination, "utf8"), /I prefer short answers/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a profile that already holds the import marker is not duplicated", () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    const canonical = realpathSync(source);
    mkdirSync(join(home, ".agent-memory", "human"), { recursive: true });
    writeFileSync(destination, `# Human — Profile\n\n## Imported from ${canonical}\n\n<!-- imported from ${canonical} on 2026-01-01 -->\n\nI prefer short answers.\n`, "utf8");
    const result = run(home, ["import", "--from", source, "--yes"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Already present/);
    assert.equal(readFileSync(destination, "utf8").match(/I prefer short answers/g).length, 1);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("concurrent imports of one source append it once behind a dead request", async () => {
  const { home, source } = setup();
  const queue = join(home, ".agent-memory", "human", ".import-queue");
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    mkdirSync(queue, { recursive: true });
    mkdirSync(join(queue, "0-2147483647-test"));
    const codes = await Promise.all(Array.from({ length: 8 }, () => spawnAsync(home, ["import", "--from", source, "--yes"])));
    assert.ok(codes.every((code) => code === 0), `exit codes ${codes.join(",")}`);
    assert.equal(readFileSync(destination, "utf8").match(/I prefer short answers/g).length, 1);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("concurrent imports of one source append it once", async () => {
  const { home, source } = setup();
  const destination = join(home, ".agent-memory", "human", "profile.md");
  try {
    const codes = await Promise.all(Array.from({ length: 8 }, () => spawnAsync(home, ["import", "--from", source, "--yes"])));
    assert.ok(codes.every((code) => code === 0), `exit codes ${codes.join(",")}`);
    assert.equal(readFileSync(destination, "utf8").match(/I prefer short answers/g).length, 1);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
