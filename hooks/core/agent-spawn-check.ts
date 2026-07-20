#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const agentsDirectory = join(homedir(), ".agent-memory", "agents");
const requiredReads: Record<string, string[]> = {};

function discoverAgents(): Map<string, string> {
  const agents = new Map<string, string>();
  try {
    for (const name of readdirSync(agentsDirectory)) {
      const path = join(agentsDirectory, name);
      if (statSync(path).isDirectory() && existsSync(join(path, "soul.md"))) agents.set(name.toLowerCase(), name);
    }
  } catch {
    return agents;
  }
  return agents;
}

function getWakeRequirements(agentName: string): string[] {
  return existsSync(join(agentsDirectory, agentName.toLowerCase(), "WAKE.md")) ? ["WAKE.md"] : [];
}

function resolveAgent(agentType: string, prompt: string): string | null {
  const agents = discoverAgents();
  const lowerPrompt = prompt.toLowerCase();
  for (const [key, name] of agents) {
    const pattern = new RegExp(`\\b(?:you are|become|as|hey)\\s+@?${escapeRegex(key)}\\b`);
    if (pattern.test(lowerPrompt)) return name;
  }
  const candidate = agentType.trim().toLowerCase();
  if (agents.has(candidate)) return agents.get(candidate) ?? null;
  for (const [key, name] of agents) {
    if (lowerPrompt.includes(`/.agent-memory/agents/${key}/`) || lowerPrompt.includes(`agents/${key}/`)) return name;
  }
  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkSpawnRequirements(agentType: string, prompt: string): string[] {
  const agentName = resolveAgent(agentType, prompt);
  if (!agentName) return [];

  const lower = prompt.toLowerCase();
  const agentPath = `agents/${agentName.toLowerCase()}/`;
  const violations: string[] = [];
  const readsIdentity = lower.includes(agentPath) || ["soul.md", "work.md"].every((name) => lower.includes(name));
  const readsBrain = lower.includes(agentPath) || ["brain/memory.md", "brain/learnings.md", "brain/patterns.md"].every((name) => lower.includes(name));

  if (!readsIdentity || !readsBrain) {
    violations.push(`Agent '${agentName}' must be told to read its identity and brain files before working: ~/.agent-memory/agents/${agentName.toLowerCase()}/soul.md, work.md, brain/memory.md, brain/learnings.md, and brain/patterns.md.`);
  }

  const agentKey = agentName.toLowerCase();
  const files = [...(requiredReads[agentKey] ?? []), ...getWakeRequirements(agentName)];
  const missingFiles = files.filter((file) => !lower.includes(file.toLowerCase()));
  if (missingFiles.length) {
    violations.push(`Agent '${agentName}' has mandatory reads that must be included in the spawn prompt:\n${missingFiles.map((file) => `  - ${file}`).join("\n")}\n\nCheck ~/.agent-memory/agents/${agentKey}/WAKE.md or required reads. Add them to the spawn prompt so the agent reads them at wake.`);
  }

  const negativeLogging = /\b(?:do not|don't|dont|no need to)\s+(?:read|log|update)/.test(lower);
  const segments = lower.split(/[!?]\s+|\n+/);
  const hasLogTarget = (filename: string) => segments.some((segment) => filename.includes(".") && segment.includes(filename) && /\b(?:log|update|write|record)\b/.test(segment));
  const hasTraceContract = lower.includes("trace") && ["session", "brain-sync", "bidirectional"].some((part) => lower.includes(part));
  if (negativeLogging || !hasLogTarget("memory.md") || !hasLogTarget("activity.md") || !hasTraceContract) {
    violations.push(`Agent '${agentName}' must be told to log its work before finishing: update its brain/memory.md and the relevant project ACTIVITY.md with the session ID and bidirectional traces.`);
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
  const subagents = input.subagents ?? input.Subagents;
  const requests = Array.isArray(subagents) ? subagents : [input];
  const violations = requests.flatMap((request) => {
    if (!request || typeof request !== "object") return [];
    const agent = request as Record<string, unknown>;
    const type = String(agent.subagent_type ?? agent.agent_type ?? agent.TypeName ?? agent.Role ?? agent.profile ?? agent.name ?? "");
    return checkSpawnRequirements(type, extractPrompt(agent));
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
  } catch {
    process.exitCode = 0;
  }
}
