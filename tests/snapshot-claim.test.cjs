const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdirSync, mkdtempSync, rmSync, utimesSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const root = join(__dirname, "..");

function claim(home) {
  const script = [
    `const { claimOverwriteSnapshot } = require(${JSON.stringify(join(root, "dist", "hooks", "core", "dispatch.js"))});`,
    `process.stdout.write(String(claimOverwriteSnapshot("race")));`,
  ].join("\n");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["-e", script], {
      env: { ...process.env, HOME: home, USERPROFILE: home },
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("close", () => resolve(output.trim() === "true"));
  });
}

test("a stale marker has exactly one winner across processes", async () => {
  const home = mkdtempSync(join(tmpdir(), "agent-claim-"));
  const state = join(home, ".agent-memory", "hooks", "shared", "state");
  const marker = join(state, "overwrite-snapshot-race");
  try {
    mkdirSync(marker, { recursive: true });
    const old = new Date(Date.now() - 600_000);
    utimesSync(marker, old, old);

    const results = await Promise.all(Array.from({ length: 6 }, () => claim(home)));
    assert.equal(results.filter(Boolean).length, 1, `expected one winner, got ${results.filter(Boolean).length}`);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
