#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const agentsDirectory = join(homedir(), ".agent-memory", "agents");
const requiredReads: Record<string, string[]> = {};

function discoverAgents(): Map<string, string> {
  const agents = new Map<string, string>();
  try {
    for (const name of readdirSync(agentsDirectory)) {
      if (existsSync(join(agentsDirectory, name, "soul.md"))) agents.set(name.toLowerCase(), name);
    }
  } catch {
    return agents;
  }
  return agents;
}

function detectAgentWake(message: string): string | null {
  const lower = message.toLowerCase().trim();
  for (const agent of discoverAgents().keys()) {
    const patterns = [
      new RegExp(`^hey\\s+@?${escapeRegex(agent)}\\b`),
      new RegExp(`^hi\\s+@?${escapeRegex(agent)}\\b`),
      new RegExp(`^yo\\s+@?${escapeRegex(agent)}\\b`),
      new RegExp(`^@${escapeRegex(agent)}\\b`),
      new RegExp(`^${escapeRegex(agent)},`),
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
  const agent = detectAgentWake(message);
  if (!agent || !requiredReads[agent]) return;
  const files = requiredReads[agent].map((file) => `  - ${file}`).join("\n");
  process.stdout.write(`${JSON.stringify({
    message: `[WAKE PROTOCOL for ${agent[0].toUpperCase()}${agent.slice(1)}]\nThis agent has mandatory content reads beyond the standard brain files:\n${files}\nRead these BEFORE responding. They ground the agent's craft.`,
  })}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exitCode = 0;
  }
}
