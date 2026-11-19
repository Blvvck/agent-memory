import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { projectMemoryDirectory, projectMemoryRoot } from "../../memory-paths";

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      new RegExp(`(?:^|\\s)@${escapeRegex(key)}\\b`),
      new RegExp(`\\b(?:hey|hi|yo|ask|call|wake)\\s+@?${escapeRegex(key)}\\b`),
    ];
    if (patterns.some((pattern) => pattern.test(lower))) return agent;
  }
  return null;
}

export function promptFromPayload(payload: Record<string, unknown>): string {
  if (typeof payload.prompt === "string" && payload.prompt) return payload.prompt;
  if (typeof payload.lastUserInput === "string" && payload.lastUserInput) return payload.lastUserInput;
  if (typeof payload.message === "string" && payload.message) return payload.message;
  const message = payload.message && typeof payload.message === "object" && !Array.isArray(payload.message)
    ? payload.message as Record<string, unknown>
    : {};
  const content = message.content ?? payload.parts;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.flatMap((part) => {
    if (typeof part === "string") return [part];
    if (!part || typeof part !== "object") return [];
    const block = part as Record<string, unknown>;
    if (typeof block.text === "string") return [block.text];
    if (typeof block.content === "string") return [block.content];
    return [];
  }).join("\n");
}

export function wakeContext(prompt: string, cwd: string): string | null {
  if (!prompt.trim()) return null;
  const agent = detectAgentWake(prompt, cwd);
  if (!agent) return null;
  const projectMemory = projectMemoryRoot(cwd);
  const projectMemoryName = projectMemoryDirectory(cwd);
  const projectReads = ["CONTEXT.md", "ACTIVITY.md"]
    .filter((file) => existsSync(join(projectMemory, file)))
    .map((file) => `${projectMemoryName}/${file}`);
  const notifications = join(homedir(), ".agent-memory", "NOTIFICATIONS.md");
  const agentReads = requiredAgentFiles.map((file) => `${agent.referenceRoot}/${file}`);
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
  if (!reads.length) return null;
  const files = reads.map((file) => `  - ${file}`).join("\n");
  const problems = [
    ...(missingAgentFiles.length ? [`Missing required body files: ${missingAgentFiles.map((file) => `${agent.referenceRoot}/${file}`).join(", ")}.`] : []),
    ...(wakeReadError ? [`Could not read ${agent.referenceRoot}/WAKE.md.`] : []),
  ];
  const displayName = `${agent.name[0].toUpperCase()}${agent.name.slice(1)}`;
  return problems.length
    ? `[WAKE BLOCKED for ${displayName}]\n${problems.join("\n")} Do not respond or act until the body is complete and readable.`
    : `[WAKE PROTOCOL for ${displayName}]\nRead these required agent and project files before responding:\n${files}\nThey contain the agent's task context and recent shared project state.`;
}
