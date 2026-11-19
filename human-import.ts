import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export function runHuman(args: string[]): void {
  const [command, ...rest] = args;
  if (command !== "import") {
    process.stdout.write(`${help()}\n`);
    return;
  }
  const fromIndex = rest.indexOf("--from");
  const explicit = fromIndex >= 0 ? rest[fromIndex + 1] : undefined;
  const dryRun = rest.includes("--dry-run");
  const confirmed = rest.includes("--yes");

  const sources = explicit ? [resolve(explicit)] : candidates();
  const found = sources.filter((path) => existsSync(path));
  if (!found.length) {
    process.stdout.write("No user.md found. Pass one with --from PATH.\n");
    return;
  }

  const destination = join(homedir(), ".agent-memory", "human", "profile.md");
  const existing = existsSync(destination) ? readFileSync(destination, "utf8") : "";
  const imported = found.filter((path) => !existing.includes(`imported from ${path}`));
  if (!imported.length) {
    process.stdout.write(`Already imported into ${destination}:\n${found.map((path) => `  ${path}`).join("\n")}\n`);
    return;
  }

  process.stdout.write(`Would append to ${destination}:\n${imported.map((path) => `  ${path}`).join("\n")}\n`);
  if (dryRun) return;
  if (!confirmed) {
    process.stdout.write("Nothing written. Run again with --yes.\n");
    return;
  }

  mkdirSync(join(homedir(), ".agent-memory", "human"), { recursive: true });
  if (!existsSync(destination)) {
    writeFileSync(destination, "# Human — Profile\n\nStable facts about the person this agent works with.\n", "utf8");
  }
  const date = new Date().toISOString().slice(0, 10);
  for (const path of imported) {
    let content = readFileSync(path, "utf8").trim();
    if (content.length > 20_000) content = `${content.slice(0, 20_000)}\n\n[truncated at 20000 characters]`;
    appendFileSync(destination, `\n\n## Imported from ${path}\n\n<!-- imported from ${path} on ${date} -->\n\n${content}\n`, "utf8");
    process.stdout.write(`Imported ${path}\n`);
  }
}
