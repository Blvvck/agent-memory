import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const knownFlags = new Set(["--from", "--dry-run", "--yes"]);

function candidates(): string[] {
  const home = homedir();
  return [
    join(home, ".codex", "user.md"),
    join(home, ".cursor", "user.md"),
    join(home, ".config", "opencode", "user.md"),
    join(home, ".claude", "user.md"),
    join(process.cwd(), "user.md"),
  ];
}

function help(): string {
  return [
    "agent-memory human import [--from PATH] [--dry-run] [--yes]",
    "",
    "Copy durable facts from an existing harness user.md into ~/.agent-memory/human/profile.md.",
    "The source file is never modified. Without --from, the known harness locations are checked.",
    "Nothing is written without --yes.",
  ].join("\n");
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
  throw new Error(message);
}

function humanRoot(): string {
  return join(homedir(), ".agent-memory", "human");
}

function manifestPath(): string {
  return join(humanRoot(), "imports.json");
}

function canonical(path: string): string {
  const absolute = resolve(path);
  try { return realpathSync(absolute); }
  catch { return absolute; }
}

function readManifest(): Record<string, string> {
  try {
    const value = JSON.parse(readFileSync(manifestPath(), "utf8")) as { sources?: Record<string, string> };
    return value && typeof value.sources === "object" && value.sources ? value.sources : {};
  } catch {
    return {};
  }
}

function writeManifest(sources: Record<string, string>): void {
  const path = manifestPath();
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({ sources }, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function withLock<T>(run: () => T): T {
  const lock = join(humanRoot(), ".import.lock");
  mkdirSync(humanRoot(), { recursive: true });
  for (let attempt = 0; attempt < 50; attempt++) {
    try { mkdirSync(lock); break; }
    catch {
      try {
        if (Date.now() - statSync(lock).mtimeMs > 30_000) { rmSync(lock, { recursive: true, force: true }); continue; }
      } catch { continue; }
      if (attempt === 49) fail("Another import is running. Try again in a moment.");
      sleepSync(100);
    }
  }
  try { return run(); }
  finally { try { rmSync(lock, { recursive: true, force: true }); } catch { /* best effort */ } }
}

function truncate(content: string): string {
  if (content.length <= 20_000) return content;
  const cut = content.lastIndexOf("\n", 20_000);
  let kept = content.slice(0, cut > 0 ? cut : 20_000);
  const fences = (kept.match(/^```/gm) ?? []).length;
  if (fences % 2 === 1) kept += "\n```";
  return `${kept}\n\n[truncated at a line boundary]`;
}

export function runHuman(args: string[]): void {
  const [command, ...rest] = args;
  if (command !== "import") {
    process.stdout.write(`${help()}\n`);
    return;
  }

  let from: string | undefined;
  let dryRun = false;
  let confirmed = false;
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (arg === "--from") {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) fail("--from needs a path.");
      from = value;
      index++;
      continue;
    }
    if (arg === "--dry-run") { dryRun = true; continue; }
    if (arg === "--yes") { confirmed = true; continue; }
    if (arg.startsWith("--")) fail(`Unknown option ${arg}.`);
    fail(`Unexpected argument ${arg}.`);
  }

  const sources = (from ? [from] : candidates()).filter((path) => existsSync(path));
  if (!sources.length) {
    process.stdout.write("No user.md found. Pass one with --from PATH.\n");
    return;
  }

  const destination = join(humanRoot(), "profile.md");
  const plan = withLock(() => {
    const imported = readManifest();
    return sources.map(canonical).filter((path) => !imported[path]);
  });

  if (!plan.length) {
    process.stdout.write(`Already imported into ${destination}:\n${sources.map((path) => `  ${path}`).join("\n")}\n`);
    return;
  }

  process.stdout.write(`Would append to ${destination}:\n${plan.map((path) => `  ${path}`).join("\n")}\n`);
  if (dryRun) return;
  if (!confirmed) {
    process.stdout.write("Nothing written. Run again with --yes.\n");
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  withLock(() => {
    const imported = readManifest();
    const pending = plan.filter((path) => !imported[path]);
    if (!pending.length) return;
    if (!existsSync(destination)) {
      writeFileSync(destination, "# Human — Profile\n\nStable facts about the person this agent works with.\n", "utf8");
    }
    for (const path of pending) {
      const content = truncate(readFileSync(path, "utf8").trim());
      appendFileSync(destination, `\n\n## Imported from ${path}\n\n<!-- imported from ${path} on ${date} -->\n\n${content}\n`, "utf8");
      imported[path] = date;
      process.stdout.write(`Imported ${path}\n`);
    }
    writeManifest(imported);
  });
}
