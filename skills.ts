#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { projectMemoryRoot } from "./memory-paths";

const START = "<!-- agent-memory:skills:start -->";
const END = "<!-- agent-memory:skills:end -->";

interface SkillEntry {
  name: string;
  description: string;
  path: string;
}

interface Frontmatter {
  name?: string;
  description?: string;
}

function pathExists(path: string): boolean {
  try { statSync(path); return true; }
  catch { return false; }
}

function backupPath(path: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${path}.agent-memory-backup-${stamp}`;
}

function writeTextFile(path: string, content: string, backup = true): void {
  mkdirSync(dirname(path), { recursive: true });
  if (backup && existsSync(path)) copyFileSync(path, backupPath(path));
  const temporary = `${path}.agent-memory-${process.pid}.tmp`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, path);
}

function parseFrontmatter(text: string): Frontmatter {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end < 0) return {};
  const result: Frontmatter = {};
  for (const line of text.slice(4, end).split("\n")) {
    const match = /^(name|description):\s*(.+)$/i.exec(line.trim());
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (match[1].toLowerCase() === "name") result.name = value;
    else result.description = value;
  }
  return result;
}

function firstParagraph(text: string): string {
  const body = text.replace(/^---[\s\S]*?\n---\n?/, "");
  let paragraph = "";
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      if (paragraph) break;
      continue;
    }
    paragraph += `${paragraph ? " " : ""}${trimmed}`;
    if (paragraph.length > 160) break;
  }
  return paragraph.replace(/[*_`]/g, "").slice(0, 140);
}

function describeSkill(file: string, fallbackName: string): SkillEntry {
  const text = readFileSync(file, "utf8");
  const frontmatter = parseFrontmatter(text);
  const description = (frontmatter.description ?? firstParagraph(text)).trim();
  return {
    name: frontmatter.name?.trim() || fallbackName,
    description: description || "No description.",
    path: file,
  };
}

function collectSkills(directory: string, oneLevel: boolean): SkillEntry[] {
  const entries: SkillEntry[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    let stat;
    try { stat = statSync(full); }
    catch { continue; }
    if (stat.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      entries.push(describeSkill(full, basename(entry.name, ".md")));
      continue;
    }
    if (!stat.isDirectory()) continue;
    if (pathExists(join(full, "SKILL.md"))) {
      entries.push(describeSkill(join(full, "SKILL.md"), entry.name));
      continue;
    }
    if (oneLevel) entries.push(...collectSkills(full, false));
  }
  return entries;
}

function discoverSkills(skillsDir: string): SkillEntry[] {
  if (!pathExists(skillsDir)) return [];
  return collectSkills(skillsDir, true).sort((a, b) => a.name.localeCompare(b.name));
}

function indexContent(projectScoped: boolean, skills: SkillEntry[], root: string): string {
  const rows = skills.map((skill) => {
    const relative = skill.path.slice(root.length + 1);
    const description = skill.description.replace(/\|/g, "\\|");
    return `| ${skill.name} | ${description} | \`${relative}\` |`;
  });
  return [
    projectScoped ? "# Project skills" : "# Shared skills",
    "",
    projectScoped
      ? "Add skill files here when the knowledge applies to this project only. Shared skills belong in `~/.agent-memory/skills/`. Run `agent-memory skills` to rebuild the index."
      : "Add reusable skill files here when an agent needs domain knowledge or a repeatable workflow across projects. Run `agent-memory skills` to rebuild the index.",
    "",
    START,
    "| Skill | Description | Path |",
    "|-------|-------------|------|",
    ...rows,
    END,
    "",
  ].join("\n");
}

export function syncSkills(scopeRoot: string, quiet = false): { count: number; index: string } {
  const skillsDir = join(scopeRoot, "skills");
  mkdirSync(skillsDir, { recursive: true });
  const skills = discoverSkills(skillsDir);
  const index = join(skillsDir, "README.md");
  const projectScoped = resolve(scopeRoot) !== join(homedir(), ".agent-memory");
  const content = indexContent(projectScoped, skills, scopeRoot);

  if (existsSync(index)) {
    const current = readFileSync(index, "utf8");
    if (current.includes(START) && current.includes(END)) {
      const start = current.indexOf(START);
      const end = current.indexOf(END);
      const block = content.slice(content.indexOf(START), content.indexOf(END) + END.length);
      const next = current.slice(0, start) + block + current.slice(end + END.length);
      if (next !== current) writeTextFile(index, next, false);
    } else if (current.trim() !== content.trim()) {
      writeTextFile(index, `${current.replace(/\s*$/, "")}\n\n${content.slice(content.indexOf(START))}`, false);
    }
  } else {
    writeTextFile(index, content, false);
  }

  if (!quiet) process.stdout.write(`[agent-memory] ${skills.length} skill${skills.length === 1 ? "" : "s"} indexed in ${index}\n`);
  return { count: skills.length, index };
}

export function runSkills(args: string[]): void {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`agent-memory skills — rebuild the skills index

Usage:
  agent-memory skills [--global|--project] [--quiet]

Scans <scope>/skills for <name>.md and <name>/SKILL.md and rewrites skills/README.md.
`);
    return;
  }
  const globalOnly = args.includes("--global");
  const projectOnly = args.includes("--project");
  const quiet = args.includes("--quiet");
  const globalRoot = join(homedir(), ".agent-memory");

  let failed = false;
  if (!projectOnly) {
    if (!pathExists(globalRoot)) {
      process.stderr.write("agent-memory skills: no global memory found. Run `agent-memory init` first.\n");
      process.exitCode = 1;
      return;
    }
    syncSkills(globalRoot, quiet);
  }

  if (!globalOnly) {
    try {
      const root = projectMemoryRoot(process.cwd());
      const isGlobal = resolve(root) === resolve(globalRoot);
      if (!isGlobal && pathExists(root)) syncSkills(root, quiet);
      else if (projectOnly) {
        process.stderr.write("agent-memory skills: no project memory found in this directory.\n");
        failed = true;
      }
    } catch (error) {
      process.stderr.write(`agent-memory skills: ${error instanceof Error ? error.message : String(error)}\n`);
      failed = true;
    }
  }

  if (failed) process.exitCode = 1;
}

if (require.main === module) runSkills(process.argv.slice(2));
