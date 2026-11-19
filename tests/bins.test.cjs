const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync, statSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

test("every bin target starts with a node shebang", () => {
  for (const [name, target] of Object.entries(manifest.bin)) {
    const path = join(root, target);
    const firstLine = readFileSync(path, "utf8").split("\n", 1)[0];
    assert.equal(firstLine, "#!/usr/bin/env node", `${name} (${target}) lacks a node shebang`);
  }
});

test("every bin target is executable on POSIX", () => {
  if (process.platform === "win32") return;
  for (const [name, target] of Object.entries(manifest.bin)) {
    const mode = statSync(join(root, target)).mode;
    assert.ok(mode & 0o111, `${name} (${target}) is not executable`);
  }
});
