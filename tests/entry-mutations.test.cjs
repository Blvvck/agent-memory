const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { deleteEntry, editEntry, repairBulletTraceMarkers, rewriteEntry } = require("../dist/protected-log.js");

const runtime = { agent: "Test", cli: "claude", session_id: "abc12345", project: "demo" };
const OTHER = { agent: "Other", cli: "claude", session_id: "def67890", project: "demo" };
const newest = "[2026-08-05T15:00:00Z] [demo] @Test [session:claude:abc12345]: Newer entry";
const older = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Older entry";
const isolated = "[2026-08-05T13:00:00Z] [demo] @Test [session:claude:abc12345]: Isolated entry";

function document(entries) {
  return `# Memory\n\nAuthored introduction.\n\n## Work Log\n\nNewest first.\n\n${entries}\n## Authored Reference\n\n- authored content stays\n`;
}

function linked() {
  return document(
    `${newest}\nMentions the older work.\n  - ↪ trace: relates-to ${older}\n\n` +
    `${older}\nThe first note.\n  - ↪ trace: none (new topic)\n  - ↪ trace-forward: ${newest}\n\n` +
    `${isolated}\nA note nothing links to.\n  - ↪ trace: none (new topic)\n`
  );
}

function fixture(contents) {
  const directory = mkdtempSync(join(tmpdir(), "agent-memory-mutation-"));
  const path = join(directory, "memory.md");
  writeFileSync(path, contents, "utf8");
  return { path, directory };
}

function run(contents, operation) {
  const { path, directory } = fixture(contents);
  try {
    operation(path);
    return readFileSync(path, "utf8");
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("edit replaces the prose and preserves subject, metadata, and trace lines", () => {
  const after = run(linked(), (path) => {
    editEntry(path, older, "Corrected prose for the first note.", runtime);
  });
  assert.match(after, /Corrected prose for the first note\./);
  assert.ok(after.includes(older));
  assert.ok(!after.includes("The first note."));
  assert.match(after, /↪ trace: none \(new topic\)/);
  assert.match(after, new RegExp(`trace-forward: .*Newer entry`));
  assert.ok(after.includes(isolated));
  assert.match(after, /- authored content stays/);
});

test("edit refuses prose that carries a trace line", () => {
  const { path, directory } = fixture(linked());
  try {
    assert.throws(
      () => editEntry(path, older, "Text\n  - ↪ trace: none (new topic)", runtime),
      /writer owns trace lines/
    );
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("edit refuses another agent's entry", () => {
  const { path, directory } = fixture(linked());
  try {
    assert.throws(() => editEntry(path, older, "Not mine.", OTHER), /only their own entries/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rewrite updates every reference to the old header", () => {
  const corrected = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Older entry, corrected";
  const after = run(linked(), (path) => {
    rewriteEntry(path, older, "Older entry, corrected\nWith corrected prose.", runtime);
  });
  assert.ok(after.includes(corrected));
  assert.ok(!after.includes(`${older}\n`));
  assert.equal(after.split(corrected).length - 1, 2, "entry header appears once and in the newer entry's trace");
  assert.match(after, /With corrected prose\./);
  assert.match(after, /↪ trace: none \(new topic\)/);
});

test("rewrite refuses a subject that does not change", () => {
  const { path, directory } = fixture(linked());
  try {
    assert.throws(() => rewriteEntry(path, older, "Older entry\nNew prose.", runtime), /would not change the subject/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("delete removes an isolated entry and leaves every other byte in place", () => {
  const before = linked();
  let removed = "";
  const after = run(before, (path) => {
    removed = deleteEntry(path, isolated, runtime).removed;
  });
  assert.ok(!after.includes(isolated));
  assert.equal(after, before.replace(removed, ""));
  assert.ok(after.includes(newest));
  assert.ok(after.includes(older));
  assert.match(after, /- authored content stays/);
});

test("delete refuses an entry that traces to an older entry and explains the correction", () => {
  const { path, directory } = fixture(linked());
  try {
    assert.throws(() => deleteEntry(path, newest, runtime), (error) => {
      assert.match(error.message, /traces to an older entry/);
      assert.match(error.nextSteps, /Add a new entry that records the correction/);
      return true;
    });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("delete refuses an entry that a later entry traces to", () => {
  const { path, directory } = fixture(linked());
  try {
    assert.throws(() => deleteEntry(path, older, runtime), /a later entry traces to it/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("delete refuses an entry referenced by a stable timestamp reference", () => {
  const contents = document(
    `${newest}\nMentions the older work.\n  - ↪ trace: relates-to [2026-08-05T14:00:00Z] @Test [session:claude:abc12345]\n\n` +
    `${older}\nThe first note.\n  - ↪ trace: none (new topic)\n`
  );
  const { path, directory } = fixture(contents);
  try {
    assert.throws(() => deleteEntry(path, older, runtime), /another entry references it/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("delete refuses an entry referenced without a reciprocal forward line", () => {
  const contents = document(
    `${newest}\nMentions the older work.\n  - ↪ trace: relates-to ${older}\n\n` +
    `${older}\nThe first note.\n  - ↪ trace: none (new topic)\n`
  );
  const { path, directory } = fixture(contents);
  try {
    assert.throws(() => deleteEntry(path, older, runtime), /another entry references it/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("delete refuses another agent's entry", () => {
  const { path, directory } = fixture(linked());
  try {
    assert.throws(() => deleteEntry(path, isolated, OTHER), /only their own entries/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("delete removes the only entry and keeps authored sections", () => {
  const only = "[2026-08-05T13:00:00Z] [demo] @Test [session:claude:abc12345]: Only entry";
  const before = document(`${only}\nOnly prose.\n  - ↪ trace: none (new topic)\n`);
  let removed = "";
  const after = run(before, (path) => { removed = deleteEntry(path, only, runtime).removed; });
  assert.ok(!after.includes(only));
  assert.equal(after, before.replace(removed, ""));
  assert.match(after, /## Authored Reference/);
  assert.match(after, /- authored content stays/);
});

test("delete removes the first entry and keeps the rest in order", () => {
  const first = "[2026-08-05T15:00:00Z] [demo] @Test [session:claude:abc12345]: First isolated";
  const second = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Second isolated";
  const before = document(`${first}\nOne.\n  - ↪ trace: none (new topic)\n\n${second}\nTwo.\n  - ↪ trace: none (new topic)\n`);
  const after = run(before, (path) => { deleteEntry(path, first, runtime); });
  assert.ok(!after.includes(first));
  assert.ok(after.indexOf(second) > after.indexOf("## Work Log"));
  assert.match(after, /- authored content stays/);
});

test("delete refuses a malformed stable reference that carries trailing text", () => {
  const contents = document(
    `${newest}\nMentions the older work.\n  - ↪ trace: relates-to [2026-08-05T14:00:00Z] @Test [session:claude:abc12345] with trailing text\n\n` +
    `${older}\nThe first note.\n  - ↪ trace: none (new topic)\n`
  );
  const { path, directory } = fixture(contents);
  try { assert.throws(() => deleteEntry(path, older, runtime), /another entry references it/); }
  finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rewrite does not corrupt a reference whose subject starts with the old subject", () => {
  const target = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Target";
  const suffix = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Target suffix";
  const referrer = "[2026-08-05T15:00:00Z] [demo] @Test [session:claude:abc12345]: Referrer";
  const before = document(
    `${referrer}\nRefers to the longer one.\n  - ↪ trace: relates-to ${suffix}\n\n` +
    `${suffix}\nLonger.\n  - ↪ trace: none (new topic)\n  - ↪ trace-forward: ${referrer}\n\n` +
    `${target}\nShorter.\n  - ↪ trace: none (new topic)\n`
  );
  const after = run(before, (path) => { rewriteEntry(path, target, "Target revised\nRevised prose.", runtime); });
  assert.ok(after.includes(`relates-to ${suffix}`), "the longer reference is untouched");
  assert.ok(after.includes(`trace-forward: ${referrer}`), "the forward line is untouched");
  assert.ok(!after.includes("Target revised suffix"));
});

test("the CLI rejects a repeated option", () => {
  const first = "[2026-08-05T15:00:00Z] [demo] @Test [session:claude:abc12345]: First isolated";
  const second = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Second isolated";
  const { path, directory } = fixture(document(`${first}\nOne.\n  - ↪ trace: none (new topic)\n\n${second}\nTwo.\n  - ↪ trace: none (new topic)\n`));
  try {
    const writer = join(__dirname, "..", "dist", "agent-log.js");
    const result = spawnSync(process.execPath, [writer, "--file", path, "--delete", "--header", first, "--header", second, "--agent", "Test", "--cli", "claude", "--session-id", "abc12345", "--project", "demo"], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--header is repeated/);
    const text = readFileSync(path, "utf8");
    assert.ok(text.includes(first));
    assert.ok(text.includes(second));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rewrite preserves multiple forward traces on the target", () => {
  const mid = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Middle entry";
  const lateA = "[2026-08-05T16:00:00Z] [demo] @Test [session:claude:abc12345]: Later entry A";
  const lateB = "[2026-08-05T15:00:00Z] [demo] @Test [session:claude:abc12345]: Later entry B";
  const before = document(
    `${lateA}\nA.\n  - ↪ trace: relates-to ${mid}\n\n` +
    `${lateB}\nB.\n  - ↪ trace: relates-to ${mid}\n\n` +
    `${mid}\nMiddle prose.\n  - ↪ trace: none (new topic)\n  - ↪ trace-forward: ${lateA}\n  - ↪ trace-forward: ${lateB}\n`
  );
  const corrected = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Middle entry, corrected";
  const after = run(before, (path) => { rewriteEntry(path, mid, "Middle entry, corrected\nCorrected.", runtime); });
  assert.ok(after.includes(corrected));
  assert.equal(after.split(corrected).length - 1, 3, "entry plus two backward references");
  assert.ok(after.includes(`trace-forward: ${lateA}`));
  assert.ok(after.includes(`trace-forward: ${lateB}`));
});

test("bullet-trace repair validates the harness agent like every other write", () => {
  const target = "[2026-08-05T14:00:00Z] [demo] @Test [session:claude:abc12345]: Target entry";
  const source = "[2026-08-05T15:00:00Z] [demo] @Test [session:claude:abc12345]: Source entry";
  const contents = document(`${source}\nProse.\n  - ↪ trace: relates-to - ${target}\n\n${target}\nTarget prose.\n  - ↪ trace: none (new topic)\n`);
  const { path, directory } = fixture(contents);
  const previous = process.env.AGENT_NAME;
  try {
    process.env.AGENT_NAME = "Test";
    assert.throws(() => repairBulletTraceMarkers(path, source, OTHER), /does not match the harness-provided active agent/);
    repairBulletTraceMarkers(path, source, runtime);
    const text = readFileSync(path, "utf8");
    assert.ok(!text.includes("relates-to - ["));
    assert.ok(text.includes(`relates-to ${target}`));
  } finally {
    if (previous === undefined) delete process.env.AGENT_NAME;
    else process.env.AGENT_NAME = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a harness-provided active agent cannot be overridden", () => {
  const { path, directory } = fixture(linked());
  const previous = process.env.AGENT_NAME;
  process.env.AGENT_NAME = "Test";
  try {
    assert.throws(() => editEntry(path, older, "Not mine.", OTHER), /does not match the harness-provided active agent/);
  } finally {
    if (previous === undefined) delete process.env.AGENT_NAME;
    else process.env.AGENT_NAME = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the CLI supports --header-file and --json", () => {
  const { path, directory } = fixture(linked());
  const headerFile = join(directory, "header.txt");
  writeFileSync(headerFile, `${isolated}\n`, "utf8");
  try {
    const writer = join(__dirname, "..", "dist", "agent-log.js");
    const result = spawnSync(process.execPath, [writer, "--file", path, "--delete", "--header-file", headerFile, "--json", "--agent", "Test", "--cli", "claude", "--session-id", "abc12345", "--project", "demo"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.ok, true);
    assert.equal(parsed.deleted, isolated);
    assert.match(parsed.entry, /A note nothing links to\./);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("the CLI rejects two mutation modes at once", () => {
  const { path, directory } = fixture(linked());
  try {
    const writer = join(__dirname, "..", "dist", "agent-log.js");
    const result = spawnSync(process.execPath, [writer, "--file", path, "--edit", "--delete", "--header", older, "--content", "x", "--agent", "Test", "--cli", "claude", "--session-id", "abc12345", "--project", "demo"], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /choose one mutation mode/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("the CLI prints the entry it deletes", () => {
  const { path, directory } = fixture(linked());
  try {
    const writer = join(__dirname, "..", "dist", "agent-log.js");
    const result = spawnSync(process.execPath, [writer, "--file", path, "--delete", "--header", isolated, "--agent", "Test", "--cli", "claude", "--session-id", "abc12345", "--project", "demo"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /✓ Deleted from/);
    assert.match(result.stdout, /Removed:/);
    assert.ok(result.stdout.includes("A note nothing links to."));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
