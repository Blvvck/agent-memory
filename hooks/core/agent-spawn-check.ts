#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, posix, resolve } from "node:path";
import { projectMemoryDirectory, projectMemoryRoot } from "../../memory-paths";

const agentsDirectory = join(homedir(), ".agent-memory", "agents");
const standardWakeReads = [
  "soul.md",
  "work.md",
  "brain/worldview.md",
  "heart.md",
  "brain/memory.md",
  "brain/learnings.md",
  "brain/patterns.md",
];

type AgentBody = { name: string; directory: string; referenceRoot: string };

function readAgentBodies(directory: string, referenceRoot: string): AgentBody[] {
  try {
    return readdirSync(directory).flatMap((name) => {
      const path = join(directory, name);
      try {
        return statSync(path).isDirectory() && existsSync(join(path, "soul.md"))
          ? [{ name, directory: path, referenceRoot: `${referenceRoot}/${name}` }]
          : [];
      } catch { return []; }
    });
  } catch { return []; }
}

function discoverAgents(cwd: string): Map<string, AgentBody> {
  const agents = new Map<string, AgentBody>();
  for (const agent of readAgentBodies(agentsDirectory, "~/.agent-memory/agents")) agents.set(agent.name.toLowerCase(), agent);
  try {
    const memoryRoot = projectMemoryRoot(cwd);
    const directory = projectMemoryDirectory(cwd);
    for (const agent of readAgentBodies(join(memoryRoot, "agents"), `${directory}/agents`)) agents.set(agent.name.toLowerCase(), agent);
  } catch { }
  return agents;
}

function normalizeFileReference(reference: string, agent: AgentBody): string {
  let normalized = reference.replace(/\\/g, "/").replace(/[),.;:'"`]+$/g, "");
  const lower = normalized.toLowerCase();
  if (lower.startsWith("~/.agent-memory/")) return normalized.toLowerCase();
  const homeMemoryRoot = `${homedir().replace(/\\/g, "/")}/.agent-memory/`;
  if (lower.startsWith(homeMemoryRoot.toLowerCase())) return `~/.agent-memory/${normalized.slice(homeMemoryRoot.length)}`.toLowerCase();
  const projectRootIndex = Math.max(...[".agent-memory", ".claude", ".codex", ".opencode", ".agents", ".cursor"].map((directory) => lower.lastIndexOf(`/${directory}/`)));
  if (projectRootIndex >= 0) return normalized.slice(projectRootIndex + 1).toLowerCase();
  normalized = normalized.replace(/^\.\//, "");
  if (/^\.(?:agent-memory|claude|codex|opencode|agents|cursor)\//i.test(normalized)) return normalized.toLowerCase();
  if (normalized.startsWith("/")) return normalized.toLowerCase();
  if (normalized.startsWith("agents/")) return `${agent.referenceRoot.split("/").slice(0, -1).join("/")}/${normalized.slice("agents/".length)}`.toLowerCase();
  return posix.join(agent.referenceRoot, normalized).toLowerCase();
}

function fileReferences(text: string): string[] {
  return [...text.matchAll(/(?:~\/|\/|\.\.\/|\.\/)?[\w.-]+(?:\/[\w.-]+)*\.[a-z0-9]+/gi)]
    .map((match) => match[0].replace(/[),.;:'"`]+$/g, ""));
}

function getRequiredReads(agent: AgentBody): { files: string[]; error?: string } {
  const files = standardWakeReads.map((file) => normalizeFileReference(file, agent));
  const missingStandardFiles = standardWakeReads.filter((file) => !existsSync(join(agent.directory, file)));
  if (missingStandardFiles.length) {
    return {
      files,
      error: `Agent '${agent.name}' is missing required wake files:\n${missingStandardFiles.map((file) => `  - ${agent.referenceRoot}/${file}`).join("\n")}`,
    };
  }
  const wakePath = join(agent.directory, "WAKE.md");
  if (!existsSync(wakePath)) return { files };

  let wakeContents: string;
  try {
    wakeContents = readFileSync(wakePath, "utf8");
  } catch {
    return { files, error: `Agent '${agent.name}' has a WAKE.md that cannot be read.` };
  }

  files.push(normalizeFileReference("WAKE.md", agent));
  for (const reference of fileReferences(wakeContents)) {
    const required = normalizeFileReference(reference, agent);
    if (required !== normalizeFileReference("WAKE.md", agent) && !files.includes(required)) files.push(required);
  }
  return { files };
}

function resolveAgent(agentType: string, prompt: string, cwd: string): AgentBody | null {
  const agents = discoverAgents(cwd);
  const lowerPrompt = prompt.toLowerCase();
  for (const [key, agent] of agents) {
    const pattern = new RegExp(`\\b(?:you are|become|as|hey)\\s+@?${escapeRegex(key)}\\b`);
    if (pattern.test(lowerPrompt)) return agent;
  }
  const candidate = agentType.trim().toLowerCase();
  if (agents.has(candidate)) return agents.get(candidate) ?? null;
  for (const [key, agent] of agents) {
    if (lowerPrompt.includes(`${agent.referenceRoot.toLowerCase()}/`) || lowerPrompt.includes(`agents/${key}/`)) return agent;
  }
  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sharedWakeReads(cwd: string): string[] {
  const memoryRoot = projectMemoryRoot(cwd);
  const memoryDirectory = projectMemoryDirectory(cwd);
  const projectFiles = ["CONTEXT.md", "ACTIVITY.md"]
    .filter((file) => existsSync(join(memoryRoot, file)))
    .map((file) => `${memoryDirectory}/${file}`);
  const notifications = join(homedir(), ".agent-memory", "NOTIFICATIONS.md");
  return [...projectFiles, ...(existsSync(notifications) ? ["~/.agent-memory/NOTIFICATIONS.md"] : [])];
}

function checkSpawnRequirements(agentType: string, prompt: string, cwd: string): string[] {
  const agent = resolveAgent(agentType, prompt, cwd);
  if (!agent) return [];

  const lower = prompt.toLowerCase();
  const violations: string[] = [];
  const { files, error } = getRequiredReads(agent);
  if (error) violations.push(error);
  files.push(...sharedWakeReads(cwd));
  const promptReferences = new Set(fileReferences(prompt).map((reference) => normalizeFileReference(reference, agent)));
  const missingFiles = files.filter((file) => !promptReferences.has(file));
  if (missingFiles.length || !/\bread\b/i.test(prompt)) {
    violations.push(`Agent '${agent.name}' must be told to read every required wake and project-context file before working:\n${missingFiles.map((file) => file.startsWith("~/.agent-memory/") ? `  - ${file}` : `  - ${file}`).join("\n")}\n\nInclude each path explicitly in the spawn prompt. If the agent has a WAKE.md, include every file it lists.`);
  }

  const negativeLogging = /\b(?:do not|don't|dont|no need to)\s+(?:read|log|update)/.test(lower);
  const segments = lower.split(/[!?]\s+|\n+/);
  const hasLogTarget = (filename: string) => segments.some((segment) => filename.includes(".") && segment.includes(filename) && /\b(?:log|update|write|record)\b/.test(segment));
  const hasTraceContract = lower.includes("trace") && ["session", "brain-sync", "bidirectional"].some((part) => lower.includes(part));
  if (negativeLogging || !hasLogTarget("memory.md") || !hasLogTarget("activity.md") || !hasTraceContract) {
    violations.push(`Agent '${agent.name}' must be told to log its work before finishing: update its brain/memory.md and the relevant project ACTIVITY.md with the session ID and bidirectional traces.`);
  }
  return violations;
}

function extractPrompt(input: Record<string, unknown>): string {
  for (const key of ["prompt", "Prompt", "instructions", "task", "message"]) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  const items = input.items;
  if (Array.isArray(items)) return items.flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).text === "string" ? [(item as Record<string, string>).text] : []).join("\n");
  return "";
}

function main(): void {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(readFileSync(0, "utf8")) as Record<string, unknown>;
  } catch {
    return;
  }
  if (!["Task", "Agent", "spawn_agent"].includes(String(payload.tool_name ?? ""))) return;
  const input = payload.tool_input && typeof payload.tool_input === "object" ? payload.tool_input as Record<string, unknown> : {};
  const cwd = String(payload.cwd || process.cwd());
  const subagents = input.subagents ?? input.Subagents;
  const requests = Array.isArray(subagents) ? subagents : [input];
  const violations = requests.flatMap((request) => {
    if (!request || typeof request !== "object") return [];
    const agent = request as Record<string, unknown>;
    const type = String(agent.subagent_type ?? agent.agent_type ?? agent.TypeName ?? agent.Role ?? agent.profile ?? agent.name ?? "");
    return checkSpawnRequirements(type, extractPrompt(agent), cwd);
  });
  if (!violations.length) return;
  process.stdout.write(`${JSON.stringify({
    decision: "block",
    reason: `Agent spawn blocked — pass the read-and-log contract:\n\n${violations.map((value) => `[ERROR] ${value}`).join("\n\n")}\n\nFix the spawn prompt, then retry.`,
  })}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify({ decision: "block", reason: `Agent spawn blocked because Agent Memory could not resolve project memory safely: ${reason}` })}\n`);
  }
}
