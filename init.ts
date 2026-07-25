import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

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
    if (!Object.hasOwn(layoutDirectories, selected)) throw new Error(`Unrecognized project memory selection '${selected}' in ${markerPath}. Choose one valid layout before running setup.`);
    const extraScaffolds = scaffolded.filter((layout) => layout !== selected);
    if (extraScaffolds.length) throw new Error(`This project has additional memory scaffolds besides its selected ${layoutDirectories[selected as Layout]} directory: ${extraScaffolds.map((layout) => layoutDirectories[layout]).join(", ")}. Consolidate them into the selected directory before running setup.`);
    return selected as Layout;
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
  --agent-scope <scope> Store it globally (default) or in this project's selected memory directory
  --harness <names>     Wire claude, codex, opencode, antigravity, and/or cursor
  --yes                 Use defaults without prompts; optional modules stay off
  -h, --help            Show this guide
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
  const projectBody = body + "## This project\n\nRead " + projectMemoryName + "/CONTEXT.md before project work and recent entries in " + projectMemoryName + "/ACTIVITY.md. Record meaningful project work in that activity log.\n";
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
      ? { path: projectRoot ? join(projectRoot, ".codex", "hooks.json") : join(homedir(), ".codex", "hooks.json"), example: "codex-hooks.example.json" }
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

  if (agent) {
    const agentRoot = agentScope === "project"
      ? join(projectRoot!, layoutDirectories[layout], "agents")
      : join(memoryRoot, "agents");
    const agentTarget = join(agentRoot, agent);
    if (pathExists(agentTarget)) process.stdout.write(`  Kept existing agent body: ${agentTarget}\n`);
    else {
      const agentStats: CopyStats = { created: 0, updated: 0, kept: 0, conflicts: [] };
      copyTreeIfMissing(join(sourceRoot, ".agents", "example"), agentTarget, agentStats);
      recordCopyResult(`Starter body ${agent}`, agentStats);
    }
  }

  if (projectRoot) {
    const projectMemoryName = layoutDirectories[layout];
    const projectTarget = join(projectRoot, projectMemoryName);
    const projectStats: CopyStats = { created: 0, updated: 0, kept: 0, conflicts: [] };
    copyTreeIfMissing(join(sourceRoot, "examples", "scaffold", "project"), projectTarget, projectStats);
    if (projectWork) copyTreeIfMissing(join(sourceRoot, "examples", "scaffold", "project-work"), projectTarget, projectStats);
    if (projectTeam) copyTreeIfMissing(join(sourceRoot, "examples", "scaffold", "project-team"), projectTarget, projectStats);
    recordCopyResult(`Project memory (${projectRoot})`, projectStats);
    process.stdout.write(`  ${writeProjectLayout(projectRoot, projectMemoryName)}\n`);
    if ((harnesses.includes("codex") || harnesses.includes("opencode") || harnesses.includes("antigravity") || harnesses.includes("cursor")) && !["standard", "codex", "opencode", "cursor"].includes(layout)) process.stdout.write(`  ${createProjectEntry(projectRoot, "standard", projectMemoryName)}\n`);
    process.stdout.write(`  ${createProjectEntry(projectRoot, layout, projectMemoryName)}\n`);
    if (harnesses.includes("claude") && layout !== "claude") process.stdout.write(`  ${createProjectEntry(projectRoot, "claude", projectMemoryName)}\n`);
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
    process.stdout.write(`  1. Give ${join(agentDirectory, "soul.md")} its real voice and fill in work.md with its role.\n`);
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
