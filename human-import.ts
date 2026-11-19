import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

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
  let text: string;
  try { text = readFileSync(manifestPath(), "utf8"); }
  catch { return {}; }
  try {
    const value = JSON.parse(text) as { sources?: unknown };
    if (!value || typeof value.sources !== "object" || value.sources === null || Array.isArray(value.sources)) throw new Error("invalid");
    return value.sources as Record<string, string>;
  } catch {
    fail(`Cannot read ${manifestPath()}. Fix or remove it before importing; nothing was changed.`);
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
  const queue = join(humanRoot(), ".import-queue");
  mkdirSync(queue, { recursive: true });
  const name = `${Date.now()}-${String(process.pid).padStart(8, "0")}-${Math.random().toString(36).slice(2, 8)}`;
  const mine = join(queue, name);
  mkdirSync(mine);
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      let blocked = false;
      for (const entry of readdirSync(queue).sort()) {
        if (entry >= name) continue;
        const pid = Number(entry.split("-")[1]);
        if (Number.isFinite(pid)) {
          try { process.kill(pid, 0); blocked = true; break; }
          catch { /* dead requester */ }
        }
        try { rmSync(join(queue, entry), { recursive: true, force: true }); } catch { /* best effort */ }
      }
      if (!blocked) return run();
      sleepSync(100);
    }
  } finally {
    try { rmSync(mine, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  fail("Another import is running. Try again in a moment.");
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

  const contents = new Map<string, string>();
  for (const source of sources) {
    const path = canonical(source);
    try {
      if (!statSync(path).isFile()) fail(`${path} is not a file.`);
      contents.set(path, truncate(readFileSync(path, "utf8").trim()));
    } catch (error) {
      if (error instanceof Error && error.message.endsWith("is not a file.")) throw error;
      fail(`Cannot read ${path}. Nothing was changed.`);
    }
  }

  const destination = join(humanRoot(), "profile.md");
  const imported = readManifest();
  const plan = [...contents.keys()].filter((path) => !imported[path]);

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
    const recorded = readManifest();
    const pending = plan.filter((path) => !recorded[path]);
    if (!pending.length) return;
    let profile = existsSync(destination) ? readFileSync(destination, "utf8") : "# Human — Profile\n\nStable facts about the person this agent works with.\n";
    for (const path of pending) {
      const marker = `<!-- imported from ${path} on `;
      if (profile.includes(marker)) {
        recorded[path] = date;
        process.stdout.write(`Already present in the profile: ${path}\n`);
        continue;
      }
      profile = insertNearTop(profile, `\n## Imported from ${path}\n\n${marker}${date} -->\n\n${contents.get(path) ?? ""}\n`);
      recorded[path] = date;
      process.stdout.write(`Imported ${path}\n`);
    }
    writeFileSync(destination, profile, "utf8");
    writeManifest(recorded);
  });
}

function titleEnd(profile: string): number {
  let fenceChar = "";
  let fenceLength = 0;
  let offset = 0;
  let previousIsParagraph = false;
  for (const line of profile.split("\n")) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    const marker = indent <= 3 ? /^(`{3,}|~{3,})/.exec(trimmed) : null;
    if (marker) {
      const run = marker[1];
      if (!fenceChar) {
        fenceChar = run[0];
        fenceLength = run.length;
      } else if (run[0] === fenceChar && run.length >= fenceLength && new RegExp(`^\\${fenceChar}{${fenceLength},}\\s*$`).test(trimmed)) {
        fenceChar = "";
        fenceLength = 0;
      }
    } else if (!fenceChar && indent <= 3 && /^=+\s*$/.test(trimmed) && previousIsParagraph) {
      return offset + line.length;
    } else if (!fenceChar && indent <= 3 && /^#\s+\S/.test(trimmed)) {
      return offset + line.length;
    }
    previousIsParagraph = !fenceChar && trimmed.length > 0
      && !/^[>#]/.test(trimmed)
      && !/^([-*+]|\d+[.)])\s/.test(trimmed)
      && !marker;
    offset += line.length + 1;
  }
  return -1;
}

function insertNearTop(profile: string, section: string): string {
  const end = titleEnd(profile);
  if (end >= 0) return `${profile.slice(0, end)}\n${section}${profile.slice(end)}`;
  return `# Human — Profile\n\n${section.trimStart()}${profile ? `\n${profile}` : ""}`;
}
