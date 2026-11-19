#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { runSkills, syncSkills } from "./skills";
import { runSessions } from "./sessions";
import { runCrons } from "./crons";
import { backupAvailable, runBackup, snapshotScope } from "./backup";
import { runDoctor } from "./doctor";
import { runHuman } from "./human-import";

type Harness = "claude" | "codex" | "opencode" | "antigravity" | "cursor";
type Layout = "standard" | "claude" | "codex" | "opencode" | "antigravity" | "cursor";
type JsonRecord = Record<string, any>;

interface Options {
  globalOnly: boolean;
  forceProject: boolean;
  layout?: Layout;
  yes: boolean;
  globalTeam?: boolean;
  projectWork: boolean;
  projectTeam: boolean;
  agent?: string;
  agentScope?: "global" | "project";
  role?: string;
  git?: "tracked" | "ignored" | "skip";
  harnesses: Harness[];
}

interface CopyStats {
  created: number;
  updated: number;
  kept: number;
  conflicts: string[];
}

const harnessNames: Record<string, Harness> = {
  claude: "claude",
  "claude-code": "claude",
  codex: "codex",
  opencode: "opencode",
  antigravity: "antigravity",
  agy: "antigravity",
  cursor: "cursor",
};

const layoutDirectories: Record<Layout, string> = {
  standard: ".agent-memory",
  claude: ".claude",
  codex: ".codex",
  opencode: ".opencode",
  antigravity: ".agents",
  cursor: ".cursor",
};

const layoutEntries: Record<Layout, string> = {
  standard: "AGENTS.md",
  claude: "CLAUDE.md",
  codex: "AGENTS.md",
  opencode: "AGENTS.md",
  antigravity: "GEMINI.md",
  cursor: "AGENTS.md",
};

function parseLayout(value: string): Layout {
  const normalized = value.trim().toLowerCase();
  if (["", "standard", "portable", "agents"].includes(normalized)) return "standard";
  if (["claude", "claude-code", "crux"].includes(normalized)) return "claude";
  if (normalized === "codex") return "codex";
  if (normalized === "opencode" || normalized === "open-code") return "opencode";
  if (["antigravity", "agy"].includes(normalized)) return "antigravity";
  if (normalized === "cursor") return "cursor";
  throw new Error("Choose a project layout: standard, claude, codex, opencode, antigravity, or cursor.");
}

function packageRoot(): string {
  return resolve(__dirname, "..");
}

function pathExists(path: string): boolean {
  try { lstatSync(path); return true; }
  catch { return false; }
}

function detectProjectRoot(cwd: string): string | null {
  const home = resolve(homedir());
  let current = resolve(cwd);
  let gitRoot: string | null = null;
  let manifestRoot: string | null = null;

  while (current !== dirname(current)) {
    if (!gitRoot && pathExists(join(current, ".git"))) gitRoot = current;
    if (!manifestRoot && ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "composer.json"].some((file) => existsSync(join(current, file)))) manifestRoot = current;
    if (current === home) break;
    current = dirname(current);
  }

  return gitRoot ?? manifestRoot;
}

function parseHarnesses(value: string): Harness[] {
  const result: Harness[] = [];
  for (const token of value.split(/[\s,]+/).filter(Boolean)) {
    const harness = harnessNames[token.toLowerCase()];
    if (!harness) throw new Error(`Unknown harness '${token}'. Choose claude, codex, opencode, antigravity, or cursor.`);
    if (!result.includes(harness)) result.push(harness);
  }
  return result;
}

function existingProjectLayout(projectRoot: string): Layout | null {
  const markerPath = join(projectRoot, ".agent-memory-layout");
  const scaffolded = Object.entries(layoutDirectories)
    .filter(([, directory]) => ["CONTEXT.md", "ACTIVITY.md"].some((file) => existsSync(join(projectRoot, directory, file))))
    .map(([layout]) => layout as Layout);
  if (existsSync(markerPath)) {
    const selected = readFileSync(markerPath, "utf8").trim();
    const fromDirectory = (Object.entries(layoutDirectories) as Array<[Layout, string]>)
      .find(([, directory]) => directory === selected)?.[0];
    const layout = fromDirectory ?? (Object.hasOwn(layoutDirectories, selected) ? selected as Layout : null);
    if (!layout) throw new Error(`Unrecognized project memory selection '${selected}' in ${markerPath}. Choose one valid layout before running setup.`);
    const extraScaffolds = scaffolded.filter((candidate) => candidate !== layout);
    if (extraScaffolds.length) throw new Error(`This project has additional memory scaffolds besides its selected ${layoutDirectories[layout]} directory: ${extraScaffolds.map((candidate) => layoutDirectories[candidate]).join(", ")}. Consolidate them into the selected directory before running setup.`);
    return layout;
  }
  if (scaffolded.length > 1) {
    throw new Error(`This project already has multiple memory directories (${scaffolded.map((layout) => layoutDirectories[layout]).join(", ")}). Keep one directory, then record it in .agent-memory-layout before running setup.`);
  }
  return scaffolded[0] ?? null;
}

function parseOptions(args: string[]): Options {
  const options: Options = { globalOnly: false, forceProject: false, yes: false, projectWork: false, projectTeam: false, harnesses: [] };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "init") continue;
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--global-only") options.globalOnly = true;
    else if (arg === "--project") options.forceProject = true;
    else if (arg === "--layout") {
      options.layout = parseLayout(args[++index] ?? "");
    }
    else if (arg === "--yes" || arg === "-y") options.yes = true;
    else if (arg === "--work") options.projectWork = true;
    else if (arg === "--team") options.projectTeam = true;
    else if (arg === "--global-team") options.globalTeam = true;
    else if (arg === "--no-global-team") options.globalTeam = false;
    else if (arg === "--agent") options.agent = args[++index];
    else if (arg === "--role") options.role = args[++index] ?? "";
    else if (arg === "--git") {
      const value = String(args[++index] ?? "").trim().toLowerCase();
      if (value !== "tracked" && value !== "ignored" && value !== "skip") throw new Error("--git must be tracked, ignored, or skip.");
      options.git = value;
    }
    else if (arg === "--agent-scope") {
      const scope = String(args[++index] ?? "").trim().toLowerCase();
      if (scope !== "global" && scope !== "project") throw new Error("Choose an agent scope: global or project.");
      options.agentScope = scope;
    }
    else if (arg === "--harness") options.harnesses = parseHarnesses(args[++index] ?? "");
    else throw new Error(`Unknown option '${arg}'. Run 'agent-memory init --help' to see the options.`);
  }
  if (options.agent && !/^[a-z0-9][a-z0-9_-]*$/i.test(options.agent)) throw new Error("Agent names can use letters, numbers, hyphens, and underscores, and must start with a letter or number.");
  return options;
}

function printHelp(): void {
  process.stdout.write(`Agent Memory setup

Run this from the project you want to equip:
  agent-memory init
  npx @blvvck/agent-memory init

Options:
  --project             Set up the current directory as a project, even without a detected manifest
  --layout <name>       Choose standard, claude, codex, opencode, antigravity, or cursor project conventions
  --global-only         Set up global memory without a project scaffold
  --work                Add the project's work/ sprint, backlog, and feature templates
  --team                Add project lounge and leaderboard templates
  --global-team         Add global lounge, tasks, and leaderboard files
  --no-global-team      Skip global lounge, tasks, and leaderboard files
  --agent <name>        Create a starter body for this agent
  --role <text>         One-line role for the agent roster
  --git <mode>          tracked, ignored, or skip (default skip)
  --agent-scope <scope> Store it globally (default) or in this project's selected memory directory
  --harness <names>     Wire claude, codex, opencode, antigravity, and/or cursor
  --yes                 Use defaults without prompts; optional modules stay off
  -h, --help            Show this guide

Commands:
  agent-memory skills [--global|--project] [--quiet]   Rebuild the skills index
  agent-memory sessions [--list|--search words] [--harness name] [--limit N]
  agent-memory crons <list|add|approve|pause|resume|delete|run|logs|daemon>
  agent-memory backup <status|snapshot|list|restore|diff|prune>
  agent-memory doctor
  agent-memory human import [--from PATH] [--dry-run] [--yes]
`);
}

function copyFileIfMissing(source: string, target: string, stats: CopyStats): void {
  if (pathExists(target)) {
    const sourceIsDirectory = lstatSync(source).isDirectory();
    const targetIsDirectory = lstatSync(target).isDirectory();
    if (sourceIsDirectory && targetIsDirectory) copyTreeIfMissing(source, target, stats);
    else if (sourceIsDirectory !== targetIsDirectory) stats.conflicts.push(target);
    else stats.kept++;
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  stats.created++;
}

function copyTreeIfMissing(source: string, target: string, stats: CopyStats): void {
  if (!pathExists(target)) mkdirSync(target, { recursive: true });
  if (!lstatSync(source).isDirectory() || !lstatSync(target).isDirectory()) {
    stats.conflicts.push(target);
    return;
  }
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) copyTreeIfMissing(from, to, stats);
    else if (entry.isFile()) copyFileIfMissing(from, to, stats);
  }
}

export function personalizeAgentBody(target: string, name: string, role?: string): void {
  const replacements: Array<[RegExp, string]> = [
    [/^# Example — /gm, `# ${name} — `],
    [/\*\*Name:\*\* Example\b/g, `**Name:** ${name}`],
  ];
  if (role) replacements.push([/\*\*Role:\*\* \[one line: what this agent is responsible for\]/g, `**Role:** ${role}`]);
  for (const file of markdownFiles(target)) {
    const text = readFileSync(file, "utf8");
    let next = text;
    for (const [pattern, value] of replacements) next = next.replace(pattern, () => value);
    if (next !== text) writeFileSync(file, next);
  }
}

function markdownFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

function copyManagedRuntime(source: string, target: string, stats: CopyStats): void {
  if (!pathExists(target)) mkdirSync(target, { recursive: true });
  if (!lstatSync(source).isDirectory() || !lstatSync(target).isDirectory()) {
    stats.conflicts.push(target);
    return;
  }
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) copyManagedRuntime(from, to, stats);
    else if (entry.isFile()) {
      const existed = pathExists(to);
      if (existed && lstatSync(to).isSymbolicLink()) {
        stats.conflicts.push(to);
        continue;
      }
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
      if (existed) stats.updated++;
      else stats.created++;
    }
  }
}

function copyGlobalScaffold(source: string, target: string, includeTeam: boolean, stats: CopyStats): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (!includeTeam && ["LOUNGE.md", "TASKS.md", "LEADERBOARD.md"].includes(entry.name)) continue;
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) copyTreeIfMissing(from, to, stats);
    else if (entry.isFile()) copyFileIfMissing(from, to, stats);
  }
}

function recordCopyResult(label: string, stats: CopyStats): void {
  process.stdout.write(`  ${label}: added ${stats.created} file${stats.created === 1 ? "" : "s"}`);
  if (stats.updated) process.stdout.write(`; refreshed ${stats.updated} runtime file${stats.updated === 1 ? "" : "s"}`);
  if (stats.kept) process.stdout.write(`; kept ${stats.kept} existing`);
  process.stdout.write("\n");
  if (stats.conflicts.length) {
    process.stdout.write("  These paths already exist with a different type and were left alone:\n");
    for (const path of stats.conflicts) process.stdout.write(`    ${path}\n`);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeHookGroups(currentValue: unknown, incomingValue: unknown): JsonRecord[] {
  const current = Array.isArray(currentValue) ? currentValue.map((item) => isRecord(item) ? item : {}) : [];
  const incoming = Array.isArray(incomingValue) ? incomingValue.filter(isRecord) : [];
  for (const group of incoming) {
    const matcher = group.matcher ?? null;
    const existing = current.find((item) => (item.matcher ?? null) === matcher);
    if (!existing) {
      current.push(structuredClone(group));
      continue;
    }
    const existingHooks = Array.isArray(existing.hooks) ? existing.hooks : [];
    const incomingHooks = Array.isArray(group.hooks) ? group.hooks : [];
    const commands = new Set(existingHooks.filter(isRecord).map((hook) => String(hook.command ?? "")));
    existing.hooks = [...existingHooks, ...incomingHooks.filter((hook) => isRecord(hook) && !commands.has(String(hook.command ?? "")))];
  }
  return current;
}

function mergedHookDocument(existingValue: unknown, incomingValue: JsonRecord, namespace?: string, flatHooks = false): JsonRecord {
  const existing = isRecord(existingValue) ? structuredClone(existingValue) : {};
  if (namespace) {
    const currentHooks = isRecord(existing[namespace]) ? existing[namespace] : {};
    const newHooks = isRecord(incomingValue[namespace]) ? incomingValue[namespace] : {};
    const merged: JsonRecord = { ...currentHooks };
    for (const [event, groups] of Object.entries(newHooks)) merged[event] = mergeHookGroups(currentHooks[event], groups);
    existing[namespace] = merged;
    return existing;
  }
  const currentHooks = isRecord(existing.hooks) ? existing.hooks : {};
  const newHooks = isRecord(incomingValue.hooks) ? incomingValue.hooks : {};
  const merged: JsonRecord = { ...existing, ...Object.fromEntries(Object.entries(incomingValue).filter(([key]) => key !== "hooks")) };
  merged.hooks = { ...currentHooks };
  for (const [event, groups] of Object.entries(newHooks)) {
    if (flatHooks) {
      const current = Array.isArray(currentHooks[event]) ? currentHooks[event] as JsonRecord[] : [];
      const incoming = Array.isArray(groups) ? groups.filter(isRecord) : [];
      const commands = new Set(current.map((hook) => String(hook.command ?? "")));
      merged.hooks[event] = [...current, ...incoming.filter((hook) => !commands.has(String(hook.command ?? ""))).map((hook) => structuredClone(hook))];
    } else merged.hooks[event] = mergeHookGroups(currentHooks[event], groups);
  }
  return merged;
}

function backupPath(path: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${path}.agent-memory-backup-${stamp}`;
}

function writeJsonFile(path: string, document: JsonRecord): string | null {
  mkdirSync(dirname(path), { recursive: true });
  const backup = existsSync(path) ? backupPath(path) : null;
  if (backup) copyFileSync(path, backup);
  const temporary = `${path}.agent-memory-${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
  return backup;
}

function wireJsonHooks(path: string, incoming: JsonRecord, namespace?: string, flatHooks = false): string {
  let existing: JsonRecord = {};
  if (existsSync(path)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
      if (!isRecord(parsed)) throw new Error("root value is not an object");
      existing = parsed;
    } catch {
      const example = namespace ? "antigravity-hooks.example.json" : path.includes("codex") ? "codex-hooks.example.json" : path.includes(".cursor") ? "cursor-hooks.example.json" : "settings.example.json";
      return `Could not parse ${path}; left it unchanged. Add the Agent Memory hook entries from ~/.agent-memory/${example} manually.`;
    }
  }
  const merged = mergedHookDocument(existing, incoming, namespace, flatHooks);
  if (JSON.stringify(existing) === JSON.stringify(merged)) return `Hooks already present in ${path}`;
  const backup = writeJsonFile(path, merged);
  return `Merged hooks into ${path}${backup ? `; saved the original as ${backup}` : ""}`;
}

function sameLink(path: string, target: string): boolean {
  try {
    if (!lstatSync(path).isSymbolicLink()) return false;
    const realTarget = resolve(dirname(path), readlinkSync(path));
    return realTarget === target || realpathSync(realTarget) === realpathSync(target);
  } catch { return false; }
}

function linkFile(target: string, path: string): string {
  mkdirSync(dirname(path), { recursive: true });
  if (pathExists(path)) {
    if (sameLink(path, target)) return `Already linked: ${path}`;
    return `Kept existing ${path}; connect it to ${target} manually if you want Agent Memory instructions loaded.`;
  }
  try {
    symlinkSync(target, path, process.platform === "win32" ? "file" : undefined);
    return `Linked instructions: ${path}`;
  } catch {
    return `Could not create ${path}; add a reference to ${target} in that harness's instructions.`;
  }
}

function addClaudeImport(path: string, target: string): string {
  const importLine = `@${target}`;
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) {
    writeFileSync(path, `${importLine}\n`, "utf8");
    return `Added Agent Memory import to ${path}`;
  }
  if (lstatSync(path).isSymbolicLink()) return `Kept existing symlink ${path}; verify it loads ${target}.`;
  const content = readFileSync(path, "utf8");
  if (content.includes(importLine)) return `Agent Memory import already present in ${path}`;
  copyFileSync(path, backupPath(path));
  writeFileSync(path, `${content.replace(/\s*$/, "")}\n\n${importLine}\n`, "utf8");
  return `Added Agent Memory import to ${path}; saved a timestamped backup.`;
}

function installInstructions(harness: Harness, memoryRoot: string): string {
  const shared = join(memoryRoot, "AGENTS.md");
  if (harness === "claude") return addClaudeImport(join(homedir(), ".claude", "CLAUDE.md"), shared);
  if (harness === "cursor") return "Cursor loads the shared Agent Memory wake instructions at session start; project setup also uses the root AGENTS.md instructions.";
  const path = harness === "codex"
    ? join(homedir(), ".codex", "AGENTS.md")
    : harness === "opencode"
      ? join(homedir(), ".config", "opencode", "AGENTS.md")
      : join(homedir(), ".gemini", "GEMINI.md");
  return linkFile(shared, path);
}

function createProjectEntry(projectRoot: string, layout: Layout, projectMemoryName: string): string {
  const filename = layoutEntries[layout];
  const path = join(projectRoot, filename);
  if (pathExists(path)) return `Kept existing project instructions: ${path}; add a note pointing to ${projectMemoryName}/CONTEXT.md and ${projectMemoryName}/ACTIVITY.md if it does not already include them`;
  const body = layout === "claude"
    ? "@~/.agent-memory/AGENTS.md\n" + (existsSync(join(projectRoot, "AGENTS.md")) ? "@AGENTS.md\n" : "") + "\n"
    : "# Agent Memory project entry\n\nRead ~/.agent-memory/AGENTS.md for the shared wake, memory, and logging rules.\n\n";
  const projectBody = body + "## This project\n\nRead " + projectMemoryName + "/CONTEXT.md before project work and recent entries in " + projectMemoryName + "/ACTIVITY.md. Record meaningful project work in that activity log. Installed modules and their procedures are listed in " + projectMemoryName + "/MODULES.md.\n";
  writeFileSync(path, projectBody, "utf8");
  return `Created project instructions: ${path}`;
}

function writeProjectLayout(projectRoot: string, projectMemoryName: string): string {
  const path = join(projectRoot, ".agent-memory-layout");
  if (existsSync(path) && readFileSync(path, "utf8").trim() === projectMemoryName) return `Project layout selection: ${projectMemoryName}`;
  if (existsSync(path)) copyFileSync(path, backupPath(path));
  writeFileSync(path, `${projectMemoryName}\n`, "utf8");
  return `Selected project memory directory: ${projectMemoryName}`;
}

const ROSTER_START = "<!-- agent-memory:agents:start -->";
const ROSTER_END = "<!-- agent-memory:agents:end -->";

function agentRosterIntro(projectScoped: boolean): string {
  const lines = [
    "## Named agents",
    "",
    "Every named agent available in this scope is listed here. `agent-memory init --agent <name>` adds or updates the row automatically. Keep the table current when a body is renamed, removed, or repurposed.",
    "",
  ];
  if (!projectScoped) lines.push("Project-scoped agents are listed in `agents/README.md` inside the project's memory directory.", "");
  return lines.join("\n");
}

function agentRosterTable(): string {
  return [ROSTER_START, "| Agent | Role | Scope | Body |", "|-------|------|-------|------|", ROSTER_END].join("\n");
}

function writeTextFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) copyFileSync(path, backupPath(path));
  const temporary = `${path}.agent-memory-${process.pid}.tmp`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, path);
}

function ensureAgentRoster(path: string): string {
  if (!existsSync(path)) return "";
  const content = readFileSync(path, "utf8");
  if (content.includes(ROSTER_START)) return "";
  writeTextFile(path, `${content.replace(/\s*$/, "")}\n\n${agentRosterIntro(false)}${agentRosterTable()}\n`);
  return `Added the named-agent roster to ${path}`;
}

function ensureSkillsSection(path: string): string {
  if (!existsSync(path)) return "";
  const content = readFileSync(path, "utf8");
  if (content.includes("\n## Skills\n")) return "";
  const section = [
    "## Skills",
    "",
    "Skills are reusable procedures written as Markdown. Shared skills live in `~/.agent-memory/skills/`; project skills live in `skills/` inside the project's memory directory. Each skill is `<name>.md` or `<name>/SKILL.md`, with optional `name` and `description` frontmatter.",
    "",
    "Each scope keeps its catalog in `skills/README.md`. Run `agent-memory skills` after adding, renaming, or removing a skill; setup also rebuilds it. Read the catalog before specialized work and open only the skill you need.",
    "",
    "To reuse an existing harness skill directory, link it into `~/.agent-memory/skills/` once.",
    "",
  ].join("\n");
  writeTextFile(path, `${content.replace(/\s*$/, "")}\n\n${section}`);
  return `Added the skills section to ${path}`;
}

const MODULES_START = "<!-- agent-memory:modules:start -->";
const MODULES_END = "<!-- agent-memory:modules:end -->";

function moduleRows(scopeRoot: string, projectScoped: boolean): string[] {
  const rows: string[] = [];
  if (projectScoped) {
    rows.push("| Core | `CONTEXT.md`, `ACTIVITY.md`, `IDEAS.md`, `skills/README.md` | `AGENTS.md`, `protocols/agent-log.md` |");
    if (existsSync(join(scopeRoot, "work", "SPRINT.md"))) {
      rows.push("| Work planning | `work/SPRINT.md`, `work/BACKLOG.md`, `work/features/` | `examples/protocols/project-planning.md`, `examples/protocols/sprint-lifecycle.md` |");
    }
    if (existsSync(join(scopeRoot, "LOUNGE.md")) || existsSync(join(scopeRoot, "LEADERBOARD.md"))) {
      rows.push("| Team | `LOUNGE.md`, `LEADERBOARD.md` | `examples/protocols/team-coordination.md`, `examples/protocols/standup.md` |");
    }
  } else {
    rows.push("| Core | `ACTIVITY.md`, `NOTIFICATIONS.md`, `skills/README.md` | `AGENTS.md`, `protocols/agent-log.md` |");
    if (existsSync(join(scopeRoot, "LOUNGE.md")) || existsSync(join(scopeRoot, "TASKS.md"))) {
      rows.push("| Team | `LOUNGE.md`, `TASKS.md`, `LEADERBOARD.md` | `examples/protocols/team-coordination.md`, `examples/protocols/standup.md`, `examples/protocols/file-updates.md` |");
    }
  }
  return rows;
}

function moduleBlock(rows: string[]): string {
  return [MODULES_START, "| Module | Files | Procedure |", "|--------|-------|-----------|", ...rows, MODULES_END].join("\n");
}

function modulesIntro(projectScoped: boolean): string {
  return projectScoped
    ? "This project's memory directory contains the modules listed below. Run `agent-memory init --project --work --team` to add an optional module; setup adds missing files and leaves existing ones alone."
    : "This scope contains the modules listed below. Run `agent-memory init --global-team` to add the optional team files; setup adds missing files and leaves existing ones alone.";
}

function updateModules(content: string, rows: string[], projectScoped: boolean): string {
  const block = moduleBlock(rows);
  if (content.includes(MODULES_START)) {
    const start = content.indexOf(MODULES_START);
    const end = content.indexOf(MODULES_END);
    return content.slice(0, start) + block + content.slice(end + MODULES_END.length);
  }
  const intro = modulesIntro(projectScoped);
  if (!content.trim()) return `# Installed modules\n\n${intro}\n\n${block}\n`;
  const heading = projectScoped ? "## Modules" : "## Installed modules";
  return `${content.replace(/\s*$/, "")}\n\n${heading}\n\n${intro}\n\n${block}\n`;
}

function writeIfChanged(path: string, content: string): void {
  if (existsSync(path) && readFileSync(path, "utf8") === content) return;
  writeTextFile(path, content);
}

function gitRootFor(path: string): string | null {
  if (!pathExists(path)) return null;
  const result = spawnSync("git", ["-C", path, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  return result.stdout.trim();
}

function gitTrack(paths: string[], root: string): string {
  const entries = [...new Set(paths.filter((path) => existsSync(path) && !path.includes(".agent-memory-backup-")).map((path) => relative(root, path)).filter((entry) => entry && !entry.startsWith("..")))];
  if (!entries.length) return "";
  const result = spawnSync("git", ["-C", root, "add", "--", ...entries, ":(exclude,glob)**/*.agent-memory-backup-*", ":(exclude,glob)**/backup/**"], { encoding: "utf8" });
  if (result.status !== 0) return `Could not stage memory files: ${result.stderr.trim()}`;
  return `Staged ${entries.length} memory path${entries.length === 1 ? "" : "s"} in ${root}`;
}

function gitIgnore(entries: string[], root: string): string {
  const file = join(root, ".gitignore");
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  const lines = current.split("\n").map((line) => line.trim());
  const missing = [...new Set(entries.filter((entry) => entry && !entry.startsWith("..") && !lines.includes(entry)))];
  if (!missing.length) return `Memory paths already ignored in ${file}`;
  const next = `${current.replace(/\s*$/, "")}${current.trim() ? "\n" : ""}${missing.join("\n")}\n`;
  writeFileSync(file, next, "utf8");
  return `Added ${missing.length} ignore entr${missing.length === 1 ? "y" : "ies"} to ${file}`;
}

function applyGitChoice(git: Options["git"], memoryRoot: string, projectRoot: string | null, projectTarget: string | null, extraPaths: string[]): void {
  if (!git || git === "skip") return;
  const scopes = new Map<string, { paths: string[]; entries: string[] }>();
  const globalRoot = gitRootFor(memoryRoot);
  if (globalRoot) {
    scopes.set(globalRoot, {
      paths: git === "tracked" ? [memoryRoot] : [],
      entries: git === "ignored" ? [`${relative(globalRoot, memoryRoot)}/`, "*.agent-memory-backup-*"] : [],
    });
  }
  if (projectRoot && projectTarget) {
    const root = gitRootFor(projectRoot);
    if (root) {
      const existing = scopes.get(root) ?? { paths: [], entries: [] };
      if (git === "tracked") existing.paths.push(projectTarget, join(projectRoot, ".agent-memory-layout"), ...extraPaths);
      else existing.entries.push(`${relative(root, projectTarget)}/`, ".agent-memory-layout", "*.agent-memory-backup-*");
      scopes.set(root, existing);
    }
  }
  for (const [root, scope] of scopes) {
    process.stdout.write(`  ${git === "tracked" ? gitTrack(scope.paths, root) : gitIgnore(scope.entries, root)}\n`);
  }
}

function upsertAgentRoster(path: string, name: string, role: string, scope: string, body: string, projectScoped: boolean): string {
  let content = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (!content) content = `# Named agents (project)\n\n${agentRosterIntro(true)}${agentRosterTable()}\n`;
  else if (!content.includes(ROSTER_START)) content = `${content.replace(/\s*$/, "")}\n\n${agentRosterIntro(projectScoped)}${agentRosterTable()}\n`;

  const start = content.indexOf(ROSTER_START);
  const end = content.indexOf(ROSTER_END);
  const block = content.slice(start, end + ROSTER_END.length);
  const rows = block.split("\n").filter((line) => line.startsWith("|") && !/^\|\s*(Agent|-)/.test(line));
  const safeRole = role.replace(/\|/g, "\\|");
  const row = `| ${name} | ${safeRole} | ${scope} | \`${body}\` |`;
  const existing = rows.findIndex((line) => line.split("|")[1]?.trim() === name);
  if (existing >= 0) rows[existing] = row;
  else rows.push(row);

  const nextBlock = [ROSTER_START, "| Agent | Role | Scope | Body |", "|-------|------|-------|------|", ...rows, ROSTER_END].join("\n");
  writeTextFile(path, content.slice(0, start) + nextBlock + content.slice(end + ROSTER_END.length));
  return `Registered ${name} in the agent roster: ${path}`;
}

function installOpenCodePlugin(memoryRoot: string, pluginDirectory?: string): string {
  const target = join(memoryRoot, "dist", "hooks", "harnesses", "opencode", "plugin.js");
  const directory = pluginDirectory ?? join(homedir(), ".config", "opencode", "plugins");
  return linkFile(target, join(directory, "agent-memory.js"));
}

function wireHarness(harness: Harness, memoryRoot: string, projectRoot?: string): string[] {
  const outcomes = [installInstructions(harness, memoryRoot)];
  if (harness === "opencode") {
    const localPlugins = projectRoot ? join(projectRoot, ".opencode", "plugins") : undefined;
    outcomes.push(installOpenCodePlugin(memoryRoot, localPlugins));
    return outcomes;
  }

  if (harness === "cursor") {
    const configPath = projectRoot ? join(projectRoot, ".cursor", "hooks.json") : join(homedir(), ".cursor", "hooks.json");
    try {
      const example = JSON.parse(readFileSync(join(memoryRoot, "cursor-hooks.example.json"), "utf8")) as JsonRecord;
      outcomes.push(wireJsonHooks(configPath, example, undefined, true));
    } catch (error) {
      outcomes.push(`Could not configure cursor: ${error instanceof Error ? error.message : String(error)}`);
    }
    return outcomes;
  }

  const config = harness === "claude"
    ? { path: projectRoot ? join(projectRoot, ".claude", "settings.json") : join(homedir(), ".claude", "settings.json"), example: "settings.example.json" }
    : harness === "codex"
      ? { path: join(homedir(), ".codex", "hooks.json"), example: "codex-hooks.example.json" }
      : { path: projectRoot ? join(projectRoot, ".agents", "hooks.json") : join(homedir(), ".gemini", "config", "hooks.json"), example: "antigravity-hooks.example.json", namespace: "agent-memory" };
  const examplePath = join(memoryRoot, config.example);
  try {
    const example = JSON.parse(readFileSync(examplePath, "utf8")) as JsonRecord;
    outcomes.push(wireJsonHooks(config.path, example, config.namespace));
  } catch (error) {
    outcomes.push(`Could not configure ${harness}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return outcomes;
}

async function ask(question: string, fallback = ""): Promise<string> {
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  try { return (await reader.question(question)).trim() || fallback; }
  finally { reader.close(); }
}

async function askYesNo(question: string, fallback: boolean): Promise<boolean> {
  const answer = (await ask(`${question} [${fallback ? "Y/n" : "y/N"}] `, fallback ? "y" : "n")).toLowerCase();
  return ["y", "yes"].includes(answer);
}

async function interactiveHarnesses(): Promise<Harness[]> {
  const value = await ask("Which harnesses should Agent Memory connect to? Enter one or more: claude, codex, opencode, antigravity, cursor. Leave blank to do this later. ");
  return value ? parseHarnesses(value) : [];
}

function validateTemplates(root: string): void {
  const required = [
    "AGENTS.md",
    "dist/agent-log.js",
    "dist/heartbeat.js",
    "protocols/README.md",
    "protocols/agent-log.md",
    "protocols/session-lifecycle.md",
    "protocols/subagent-wake.md",
    "protocols/new-agent.md",
    "protocols/new-project.md",
    "examples/scaffold/global",
    "examples/scaffold/project",
    ".agents/example",
  ];
  const missing = required.filter((path) => !existsSync(join(root, path)));
  if (missing.length) throw new Error(`The Agent Memory package is missing setup files: ${missing.join(", ")}. Reinstall it, then run init again.`);
}

async function main(): Promise<void> {
  if (process.argv[2] === "skills") {
    runSkills(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === "sessions") {
    runSessions(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === "crons") {
    runCrons(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === "backup") {
    runBackup(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === "doctor") {
    runDoctor(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === "human") {
    runHuman(process.argv.slice(3));
    return;
  }
  const options = parseOptions(process.argv.slice(2));
  const sourceRoot = packageRoot();
  validateTemplates(sourceRoot);

  const memoryRoot = join(homedir(), ".agent-memory");
  const detectedProject = detectProjectRoot(process.cwd());
  let projectRoot = options.globalOnly ? null : options.forceProject ? detectedProject ?? resolve(process.cwd()) : detectedProject;
  let globalTeam = options.globalTeam ?? false;
  let projectWork = options.projectWork;
  let projectTeam = options.projectTeam;
  let agent = options.agent;
  let agentRole = options.role;
  let agentScope = options.agentScope ?? "global";
  let harnesses = options.harnesses;
  let layout: Layout = options.layout ?? "standard";

  process.stdout.write("\nLet’s give your agents a place to remember what matters.\n");
  process.stdout.write("I’ll set up shared memory first, then add this project’s context and activity log if you want. Existing files stay in place.\n\n");

  if (!options.yes && process.stdin.isTTY) {
    if (options.globalTeam === undefined) {
      globalTeam = await askYesNo("Add the shared lounge, follow-up list, and leaderboard too?", true);
    }
    if (!options.globalOnly && detectedProject && !options.forceProject) {
      projectRoot = await askYesNo(`Add project memory files to ${detectedProject}?`, true) ? detectedProject : null;
    } else if (!options.globalOnly && options.forceProject && !detectedProject) {
      projectRoot = resolve(process.cwd());
    }
    if (projectRoot) {
      if (!harnesses.length) harnesses = await interactiveHarnesses();
      const selectedLayout = existingProjectLayout(projectRoot);
      if (selectedLayout && options.layout && options.layout !== selectedLayout) {
        throw new Error(`This project already uses ${layoutDirectories[selectedLayout]} for its memory. Keep that single memory directory; connect additional harnesses with --harness without choosing another layout.`);
      }
      if (!options.layout) {
        const defaultLayout = selectedLayout ?? "standard";
        const promptedLayout = parseLayout(await ask(`Project memory layout [standard, claude, codex, opencode, antigravity, cursor] (${defaultLayout}): `, defaultLayout));
        if (selectedLayout && promptedLayout !== selectedLayout) {
          throw new Error(`This project already uses ${layoutDirectories[selectedLayout]} for its memory. Keep that single memory directory; connect additional harnesses without choosing another layout.`);
        }
        layout = promptedLayout;
      }
      if (!options.projectWork) projectWork = await askYesNo("Add sprint, backlog, and feature-planning files for this project?", false);
      if (!options.projectTeam) projectTeam = await askYesNo("Add a project lounge and leaderboard?", false);
    }
    if (!agent) {
      const name = await ask("Create a starter agent body now? Enter a short name, or leave blank to choose later: ");
      agent = name || undefined;
      if (agent && !/^[a-z0-9][a-z0-9_-]*$/i.test(agent)) throw new Error("Use letters, numbers, hyphens, and underscores for an agent name.");
      if (agent && projectRoot && !options.agentScope) {
        agentScope = await askYesNo("Keep this agent shared globally? Choose no to scope it to this project.", true) ? "global" : "project";
      }
      if (agent && !agentRole) {
        agentRole = await ask("Role in one line (optional): ", "Starter body; define the role in work.md");
      }
    }
    if (!projectRoot && !harnesses.length) harnesses = await interactiveHarnesses();
  } else if (options.yes && !projectRoot && options.forceProject) {
    projectRoot = resolve(process.cwd());
  }

  if (projectRoot) {
    const selectedLayout = existingProjectLayout(projectRoot);
    if (selectedLayout && options.layout && options.layout !== selectedLayout) {
      throw new Error(`This project already uses ${layoutDirectories[selectedLayout]} for its memory. Keep that single memory directory; connect additional harnesses with --harness without choosing another layout.`);
    }
    if (selectedLayout) layout = selectedLayout;
  }

  if (agentScope === "project" && !projectRoot) throw new Error("Project-scoped agent bodies require project setup; provide a project or omit --agent-scope project.");

  const globalStats: CopyStats = { created: 0, updated: 0, kept: 0, conflicts: [] };
  copyManagedRuntime(join(sourceRoot, "dist"), join(memoryRoot, "dist"), globalStats);
  copyFileIfMissing(join(sourceRoot, "AGENTS.md"), join(memoryRoot, "AGENTS.md"), globalStats);
  copyTreeIfMissing(join(sourceRoot, ".agents", "example"), join(memoryRoot, ".agents", "example"), globalStats);
  copyTreeIfMissing(join(sourceRoot, "protocols"), join(memoryRoot, "protocols"), globalStats);
  copyTreeIfMissing(join(sourceRoot, "examples"), join(memoryRoot, "examples"), globalStats);
  for (const filename of ["settings.example.json", "codex-hooks.example.json", "antigravity-hooks.example.json", "cursor-hooks.example.json"]) {
    copyFileIfMissing(join(sourceRoot, filename), join(memoryRoot, filename), globalStats);
  }
  copyGlobalScaffold(join(sourceRoot, "examples", "scaffold", "global"), memoryRoot, globalTeam, globalStats);
  recordCopyResult("Global memory", globalStats);
  const rosterSectionResult = ensureAgentRoster(join(memoryRoot, "AGENTS.md"));
  if (rosterSectionResult) process.stdout.write(`  ${rosterSectionResult}\n`);
  const skillsSectionResult = ensureSkillsSection(join(memoryRoot, "AGENTS.md"));
  if (skillsSectionResult) process.stdout.write(`  ${skillsSectionResult}\n`);
  const globalAgentsPath = join(memoryRoot, "AGENTS.md");
  if (existsSync(globalAgentsPath)) writeIfChanged(globalAgentsPath, updateModules(readFileSync(globalAgentsPath, "utf8"), moduleRows(memoryRoot, false), false));
  const globalSkills = syncSkills(memoryRoot, true);
  process.stdout.write(`  Skills index: ${globalSkills.count} in ${globalSkills.index}\n`);

  if (agent) {
    const agentRoot = agentScope === "project"
      ? join(projectRoot!, layoutDirectories[layout], "agents")
      : join(memoryRoot, "agents");
    const agentTarget = join(agentRoot, agent);
    if (pathExists(agentTarget)) process.stdout.write(`  Kept existing agent body: ${agentTarget}\n`);
    else {
      const agentStats: CopyStats = { created: 0, updated: 0, kept: 0, conflicts: [] };
      copyTreeIfMissing(join(sourceRoot, ".agents", "example"), agentTarget, agentStats);
      personalizeAgentBody(agentTarget, agent, agentRole);
      recordCopyResult(`Starter body ${agent}`, agentStats);
    }
    const rosterPath = agentScope === "project"
      ? join(projectRoot!, layoutDirectories[layout], "agents", "README.md")
      : join(memoryRoot, "AGENTS.md");
    const rosterRole = (agentRole ?? "").trim() || "Starter body; define the role in work.md";
    const rosterScope = agentScope === "project" ? "project" : "shared";
    process.stdout.write(`  ${upsertAgentRoster(rosterPath, agent, rosterRole, rosterScope, `agents/${agent}/`, agentScope === "project")}\n`);
  }

  let projectTarget: string | null = null;
  const createdEntries: string[] = [];

  if (projectRoot) {
    const projectMemoryName = layoutDirectories[layout];
    projectTarget = join(projectRoot, projectMemoryName);
    const projectStats: CopyStats = { created: 0, updated: 0, kept: 0, conflicts: [] };
    copyTreeIfMissing(join(sourceRoot, "examples", "scaffold", "project"), projectTarget, projectStats);
    if (projectWork) copyTreeIfMissing(join(sourceRoot, "examples", "scaffold", "project-work"), join(projectTarget, "work"), projectStats);
    if (projectTeam) copyTreeIfMissing(join(sourceRoot, "examples", "scaffold", "project-team"), projectTarget, projectStats);
    recordCopyResult(`Project memory (${projectRoot})`, projectStats);
    const projectSkills = syncSkills(projectTarget, true);
    process.stdout.write(`  Skills index: ${projectSkills.count} in ${projectSkills.index}\n`);
    const modulesPath = join(projectTarget, "MODULES.md");
    const modulesContent = existsSync(modulesPath) ? readFileSync(modulesPath, "utf8") : "";
    writeIfChanged(modulesPath, updateModules(modulesContent, moduleRows(projectTarget, true), true));
    process.stdout.write(`  ${writeProjectLayout(projectRoot, projectMemoryName)}\n`);
    const recordEntry = (entryLayout: Layout): string => {
      const path = join(projectRoot, layoutEntries[entryLayout]);
      const existed = existsSync(path);
      const result = createProjectEntry(projectRoot, entryLayout, projectMemoryName);
      if (!existed && existsSync(path)) createdEntries.push(path);
      return result;
    };
    if ((harnesses.includes("codex") || harnesses.includes("opencode") || harnesses.includes("antigravity") || harnesses.includes("cursor")) && !["standard", "codex", "opencode", "cursor"].includes(layout)) process.stdout.write(`  ${recordEntry("standard")}\n`);
    process.stdout.write(`  ${recordEntry(layout)}\n`);
    if (harnesses.includes("claude") && layout !== "claude") process.stdout.write(`  ${recordEntry("claude")}\n`);
  }

  if (options.git === undefined && !options.yes && process.stdin.isTTY && (projectRoot || gitRootFor(memoryRoot))) {
    const answer = (await ask("Track memory in git? [t]racked / [i]gnored / [s]kip (skip): ", "skip")).toLowerCase();
    options.git = answer.startsWith("t") ? "tracked" : answer.startsWith("i") ? "ignored" : "skip";
  }
  applyGitChoice(options.git, memoryRoot, projectRoot, projectTarget, createdEntries);

  if (!backupAvailable()) {
    process.stdout.write("  Backups: restic not installed; version history is disabled until it is available\n");
  } else {
    const globalSnapshot = snapshotScope("global", true);
    const projectSnapshot = projectRoot ? snapshotScope("project", true) : false;
    process.stdout.write(`  Backups: ${globalSnapshot || projectSnapshot ? "snapshot created" : "git is handling this scope"}\n`);
  }

  const harnessResults = harnesses.flatMap((harness) => wireHarness(harness, memoryRoot, projectRoot ?? undefined));
  for (const result of harnessResults) process.stdout.write(`  ${result}\n`);
  if (!projectRoot && harnesses.includes("cursor")) {
    process.stdout.write("  Cursor Cloud Agents do not load user-level hooks. Run `agent-memory init --project --harness cursor` in each repository where you want Cursor Cloud hooks.\n");
  }

  process.stdout.write("\nYou’re set up. Here’s how to make the memory useful on its very next wake:\n");
  if (agent) {
    const agentDirectory = agentScope === "project"
      ? join(projectRoot!, layoutDirectories[layout], "agents", agent)
      : join(memoryRoot, "agents", agent);
    process.stdout.write(`  1. Start with ${join(agentDirectory, "README.md")} for the writing order and what each file is for, then give ${join(agentDirectory, "soul.md")} its real voice and fill in work.md with its role.\n`);
  } else {
    process.stdout.write(`  1. Create an agent from ${join(memoryRoot, ".agents", "example")} when you’re ready to give it an identity.\n`);
  }
  if (projectRoot) process.stdout.write(`  2. Fill in ${join(projectRoot, layoutDirectories[layout], "CONTEXT.md")} so the agent knows what this project is trying to do.\n`);
  else process.stdout.write("  2. Run `agent-memory init --project` from a repository when you want project context and activity tracking.\n");
  if (harnesses.length) {
    process.stdout.write("  3. Restart the selected harnesses so they load the new instructions and hooks.\n");
    if (harnesses.includes("codex")) process.stdout.write("     In Codex, open `/hooks` to review and trust the new hooks before relying on them.\n");
  } else {
    process.stdout.write("  3. Connect a harness now or later with `agent-memory init --harness claude,codex,opencode,antigravity,cursor`. I’ll merge hook settings and connect the shared instructions for the harnesses you choose.\n");
  }
  const projectDirectory = layoutDirectories[layout];
  process.stdout.write("\nGlobal memory lives in ~/.agent-memory. Project work stays in that project’s " + projectDirectory + "/ACTIVITY.md. Harness setup edits only the selected harness configuration; existing JSON files are backed up before hooks are merged.\n");
  process.stdout.write(`Required procedures are installed in ${join(memoryRoot, "protocols")}; start with new-project.md for project setup and new-agent.md when adding an agent.\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Agent Memory setup stopped: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
