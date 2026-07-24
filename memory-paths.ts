import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export type ProjectMemoryDirectory = ".agent-memory" | ".claude" | ".codex" | ".opencode" | ".agents" | ".cursor";

const projectMemoryDirectories: ProjectMemoryDirectory[] = [".agent-memory", ".claude", ".codex", ".opencode", ".agents", ".cursor"];

export function projectMemoryRoot(cwd: string): string {
  let current = resolve(cwd);
  const home = resolve(homedir());
  while (true) {
    if (current === home) return join(current, ".agent-memory");
    const markerPath = join(current, ".agent-memory-layout");
    let selected: string | null = null;
    if (existsSync(markerPath)) {
      try { selected = readFileSync(markerPath, "utf8").trim(); }
      catch { throw new Error(`Could not read project memory selection at ${markerPath}.`); }
      if (!projectMemoryDirectories.includes(selected as ProjectMemoryDirectory)) throw new Error(`Unrecognized project memory selection '${selected}' in ${markerPath}.`);
    }
    const candidates: string[] = [];
    for (const name of projectMemoryDirectories) {
      const candidate = join(current, name);
      try {
        if (statSync(candidate).isDirectory() && ["CONTEXT.md", "ACTIVITY.md"].some((file) => existsSync(join(candidate, file)))) candidates.push(candidate);
      } catch {
        continue;
      }
    }
    if (selected) {
      const additional = candidates.filter((candidate) => basename(candidate) !== selected);
      if (additional.length) throw new Error(`Multiple Agent Memory project directories were found: ${[join(current, selected), ...additional].join(", ")}. Keep one memory directory and remove the extra scaffolds.`);
      return join(current, selected);
    }
    if (candidates.length > 1) throw new Error(`Multiple Agent Memory project directories were found: ${candidates.join(", ")}. Keep one memory directory and select it in .agent-memory-layout.`);
    if (candidates.length === 1) return candidates[0];
    if (existsSync(join(current, ".git"))) return join(current, ".agent-memory");
    const parent = dirname(current);
    if (parent === current) return join(resolve(cwd), ".agent-memory");
    current = parent;
  }
}

export function projectMemoryDirectory(cwd: string): ProjectMemoryDirectory {
  return basename(projectMemoryRoot(cwd)) as ProjectMemoryDirectory;
}
