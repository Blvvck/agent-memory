const assert = require("node:assert/strict");
const { test } = require("node:test");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { writeEntry } = require("../dist/protected-log.js");

const runtime = { agent: "Test", cli: "claude", session_id: "abc12345", project: "demo" };
const WORK_LOG = "## Work Log\n\nNewest first.\n\n```text\n[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened\n```\n\n";

function fixture(name, authoredHeading) {
  const directory = mkdtempSync(join(tmpdir(), "agent-memory-worklog-"));
  const path = join(directory, name);
  writeFileSync(path, `# Test\n\nAuthored introduction.\n\n${WORK_LOG}${authoredHeading}\n\n- authored content stays\n`, "utf8");
  return { path, directory };
}

test("writes land under Work Log and leave authored history intact", () => {
  const { path, directory } = fixture("memory.md", "## Formative Milestones");
  try {
    const header = writeEntry(path, "First work entry", runtime, "none (new topic)");
    const text = readFileSync(path, "utf8");
    const workLog = text.indexOf("## Work Log");
    const entry = text.indexOf(header);
    const authored = text.indexOf("## Formative Milestones");
    assert.ok(workLog < entry, "entry is below Work Log");
    assert.ok(entry < authored, "entry is above authored history");
    assert.match(text, /authored content stays/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("learnings and patterns use Work Log and traces run both ways", async () => {
  for (const name of ["learnings.md", "patterns.md"]) {
    const { path, directory } = fixture(name, "## Reference");
    try {
      const first = writeEntry(path, "First entry", runtime, "none (new topic)");
      await new Promise((resolve) => setTimeout(resolve, 1_100));
      const second = writeEntry(path, "Second entry", runtime, first);
      const text = readFileSync(path, "utf8");
      assert.ok(text.indexOf(second) < text.indexOf(first), `${name} is newest first`);
      assert.ok(text.indexOf(first) < text.indexOf("## Reference"), `${name} stays under Work Log`);
      assert.match(text, new RegExp(`trace-forward: .*${second.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `${name} adds a forward trace`);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});
