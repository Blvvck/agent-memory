#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { projectMemoryDirectory, projectMemoryRoot } from "../../../memory-paths";

const agentsDirectory = join(homedir(), ".agent-memory", "agents");
const requiredAgentFiles = ["soul.md", "work.md", "brain/worldview.md", "heart.md", "brain/memory.md", "brain/learnings.md", "brain/patterns.md"];
const fileReferencePattern = /(?:~\/|\/|\.\.\/|\.\/)?[\w.-]+(?:\/[\w.-]+)*\.[a-z0-9]+/gi;

type AgentBody = { name: string; directory: string; referenceRoot: string };

function readAgents(directory: string, referenceRoot: string): AgentBody[] {
  try {
    return readdirSync(directory).flatMap((name) => existsSync(join(directory, name, "soul.md"))
      ? [{ name, directory: join(directory, name), referenceRoot: `${referenceRoot}/${name}` }]
      : []);
  } catch { return []; }
}

function discoverAgents(cwd: string): Map<string, AgentBody> {
  const agents = new Map(readAgents(agentsDirectory, "~/.agent-memory/agents").map((agent) => [agent.name.toLowerCase(), agent]));
  const projectMemory = projectMemoryRoot(cwd);
  const projectDirectory = projectMemoryDirectory(cwd);
  for (const agent of readAgents(join(projectMemory, "agents"), `${projectDirectory}/agents`)) agents.set(agent.name.toLowerCase(), agent);
  return agents;
}

function detectAgentWake(message: string, cwd: string): AgentBody | null {
  const lower = message.toLowerCase().trim();
  for (const [key, agent] of discoverAgents(cwd)) {
    const patterns = [
      new RegExp(`^hey\\s+@?${escapeRegex(key)}\\b`),
      new RegExp(`^hi\\s+@?${escapeRegex(key)}\\b`),
      new RegExp(`^yo\\s+@?${escapeRegex(key)}\\b`),
      new RegExp(`^@${escapeRegex(key)}\\b`),
      new RegExp(`^${escapeRegex(key)},`),
    ];
    if (patterns.some((pattern) => pattern.test(lower))) return agent;
  }
  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main(): void {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(require("node:fs").readFileSync(0, "utf8")) as Record<string, unknown>;
  } catch {
    return;
  }
  const message = typeof payload.message === "string" ? payload.message : "";
  if (!message) return;
  const cwd = typeof payload.cwd === "string" ? payload.cwd : process.cwd();
  const agent = detectAgentWake(message, cwd);
  if (!agent) return;
  const projectMemory = projectMemoryRoot(cwd);
  const projectMemoryName = projectMemoryDirectory(cwd);
  const projectReads = ["CONTEXT.md", "ACTIVITY.md"]
    .filter((file) => existsSync(join(projectMemory, file)))
    .map((file) => `${projectMemoryName}/${file}`);
  const notifications = join(homedir(), ".agent-memory", "NOTIFICATIONS.md");
  const agentReads = requiredAgentFiles
    .map((file) => `${agent.referenceRoot}/${file}`);
  const missingAgentFiles = requiredAgentFiles.filter((file) => !existsSync(join(agent.directory, file)));
  const wakePath = join(agent.directory, "WAKE.md");
  let wakeReadError = false;
  if (existsSync(wakePath)) {
    agentReads.push(`${agent.referenceRoot}/WAKE.md`);
    try {
      const wakeFiles = readFileSync(wakePath, "utf8").match(fileReferencePattern) ?? [];
      for (const file of wakeFiles) {
        const reference = file.replace(/[),.;:'"`]+$/g, "");
        const normalized = /^(?:~\/|\/|\.\.\/|\.\/|\.[\w-]+\/)/.test(reference)
          ? reference
          : `${agent.referenceRoot}/${reference}`;
        if (!agentReads.includes(normalized)) agentReads.push(normalized);
      }
    } catch { wakeReadError = true; }
  }
  const reads = [
    ...agentReads,
    ...projectReads,
    ...(existsSync(notifications) ? [notifications] : []),
  ];
  if (!reads.length) return;
  const files = reads.map((file) => `  - ${file}`).join("\n");
  const problems = [
    ...(missingAgentFiles.length ? [`Missing required body files: ${missingAgentFiles.map((file) => `${agent.referenceRoot}/${file}`).join(", ")}.`] : []),
    ...(wakeReadError ? [`Could not read ${agent.referenceRoot}/WAKE.md.`] : []),
  ];
  const status = problems.length
    ? `[WAKE BLOCKED for ${agent.name[0].toUpperCase()}${agent.name.slice(1)}]\n${problems.join("\n")} Do not respond or act until the body is complete and readable.`
    : `[WAKE PROTOCOL for ${agent.name[0].toUpperCase()}${agent.name.slice(1)}]\nRead these required agent and project files before responding:\n${files}\nThey contain the agent's task context and recent shared project state.`;
  process.stdout.write(`${JSON.stringify({
    message: status,
  })}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify({ message: `[Agent Memory wake blocked] ${reason} Stop before logging and resolve the project memory selection in .agent-memory-layout.` })}\n`);
  }
}
