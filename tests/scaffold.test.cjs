const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { extname, join, relative } = require("node:path");

const root = join(__dirname, "..");
const template = join(root, ".agents", "example");

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile() && extname(entry.name) === ".md") files.push(path);
  }
  return files;
}

const templates = walk(template);

test("starter body has every template file", () => {
  assert.equal(templates.length, 16);
  for (const file of templates) {
    assert.ok(readFileSync(file, "utf8").trim().length > 0, `${relative(template, file)} is empty`);
  }
});

test("every template explains what to write and where to start", () => {
  for (const file of templates) {
    const name = relative(template, file);
    const text = readFileSync(file, "utf8");
    if (name === "README.md") continue;
    assert.match(text, /^# Example — /, `${name} has no title`);
    assert.match(text, /## How to write this file/, `${name} has no writing guide`);
    if (["brain/memory.md", "brain/learnings.md", "brain/patterns.md"].includes(name)) {
      assert.match(text, /Entries start here\./, `${name} has no entry start marker`);
    } else {
      assert.match(text, /\*\*Start here\.\*\*/, `${name} has no section start marker`);
    }
  }
});

test("every protected log follows the Work Log contract", () => {
  for (const name of ["brain/memory.md", "brain/learnings.md", "brain/patterns.md"]) {
    const text = readFileSync(join(template, name), "utf8");
    assert.equal(text.split("## Work Log").length - 1, 1, `${name} must have one Work Log`);
    assert.match(text, /YYYY-MM-DDTHH:MM:SSZ/, `${name} has no entry format`);
    assert.doesNotMatch(text, /## Recent Sessions/, `${name} still has the old heading`);
    const work = text.indexOf("## Work Log");
    const authored = text.indexOf("\n## ", work + 1);
    assert.ok(authored > work, `${name} has no authored section after the Work Log`);
  }
  assert.match(readFileSync(join(template, "brain/memory.md"), "utf8"), /Work Log below/);
});

test("the writer inserts at the starter Work Log", () => {
  const target = mkdtempSync(join(tmpdir(), "agent-log-"));
  try {
    cpSync(join(template, "brain", "memory.md"), join(target, "memory.md"));
    const result = spawnSync(process.execPath, [
      join(root, "dist", "agent-log.js"),
      "--file", join(target, "memory.md"),
      "--content", "First real entry in the starter body.",
      "--trace", "none (new topic)",
      "--agent", "Acid",
      "--cli", "claude",
      "--session-id", "abc12345",
      "--project", "demo",
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const text = readFileSync(join(target, "memory.md"), "utf8");
    assert.ok(text.indexOf("Entries start here.") < text.indexOf("First real entry in the starter body."));
    assert.ok(text.indexOf("First real entry in the starter body.") < text.indexOf("## Formative Milestones"));
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("the starter body takes the agent's name and role", () => {
  const { personalizeAgentBody } = require("../dist/init.js");
  const target = mkdtempSync(join(tmpdir(), "agent-body-"));
  try {
    cpSync(template, target, { recursive: true });
    personalizeAgentBody(target, "Acid", "Backend engineer $& $5");
    const soul = readFileSync(join(target, "soul.md"), "utf8");
    assert.match(soul, /^# Acid — Soul/m);
    assert.match(soul, /\*\*Name:\*\* Acid\b/);
    assert.match(soul, /\*\*Role:\*\* Backend engineer \$& \$5/);
    for (const file of walk(target)) {
      assert.doesNotMatch(readFileSync(file, "utf8"), /\bExample\b/, `${relative(target, file)} still names Example`);
    }
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});
