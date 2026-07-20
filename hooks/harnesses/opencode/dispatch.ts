import { dispatch } from "../../core/dispatch";

export interface HookResult {
  blocked: boolean;
  reason: string;
  contexts: string[];
  raw: Record<string, unknown>;
}

const toolNames: Record<string, string> = {
  bash: "Bash",
  edit: "Edit",
  write: "Write",
  apply_patch: "apply_patch",
  patch: "apply_patch",
  task: "Task",
  agent: "Agent",
  spawn_agent: "spawn_agent",
  webfetch: "WebFetch",
  websearch: "WebSearch",
  toolsearch: "ToolSearch",
};

function value(payload: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") return payload[key];
  return undefined;
}

function toolArgs(payload: Record<string, unknown>): Record<string, unknown> {
  const args = payload.args ?? payload.tool_input;
  return args && typeof args === "object" && !Array.isArray(args) ? args as Record<string, unknown> : {};
}

function normalizeArgs(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...args };
  const aliases: Record<string, string> = {
    filePath: "file_path",
    oldString: "old_string",
    newString: "new_string",
    subagentType: "subagent_type",
    agentType: "agent_type",
  };
  for (const [source, target] of Object.entries(aliases)) {
    if (normalized[target] === undefined && normalized[source] !== undefined) normalized[target] = normalized[source];
  }
  if (toolName === "apply_patch" && typeof normalized.command !== "string") {
    for (const key of ["patch", "input", "text"]) {
      if (typeof normalized[key] === "string") {
        normalized.command = normalized[key];
        break;
      }
    }
  }
  if (["Task", "Agent", "spawn_agent"].includes(toolName) && typeof normalized.prompt !== "string") {
    for (const key of ["instructions", "task", "description"]) {
      if (typeof normalized[key] === "string" && String(normalized[key]).trim()) {
        normalized.prompt = normalized[key];
        break;
      }
    }
  }
  return normalized;
}

export function normalizeToolPayload(event: string, payload: Record<string, unknown>): Record<string, unknown> {
  const rawToolName = String(value(payload, "tool", "tool_name") ?? "").trim();
  const toolName = toolNames[rawToolName.toLowerCase()] ?? rawToolName;
  const rawArgs = toolArgs(payload);
  return {
    ...payload,
    hook_event_name: event,
    tool_name: toolName,
    tool_input: normalizeArgs(toolName, rawArgs),
    session_id: value(payload, "session_id", "sessionID", "id"),
    cwd: value(payload, "cwd", "directory") ?? process.cwd(),
  };
}

export function parseHookResult(result: Record<string, unknown>): HookResult {
  const contexts = Array.isArray(result.contexts) ? result.contexts.map(String) : [];
  return {
    blocked: Boolean(result.blocked),
    reason: String(result.reason ?? ""),
    contexts: [...new Set(contexts)],
    raw: result,
  };
}

export function dispatchHook(event: string, payload: Record<string, unknown>): HookResult {
  const normalized = normalizeToolPayload(event, payload);
  const previousSource = process.env.AGENT_HOOK_SOURCE;
  process.env.AGENT_HOOK_SOURCE = "opencode";
  try {
    return parseHookResult(dispatch(normalized) as unknown as Record<string, unknown>);
  } finally {
    if (previousSource === undefined) delete process.env.AGENT_HOOK_SOURCE;
    else process.env.AGENT_HOOK_SOURCE = previousSource;
  }
}
