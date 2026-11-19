import { dispatchHook } from "./dispatch";

type Dict = Record<string, any>;

function textOf(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts.flatMap((part) => part && typeof part === "object" && (part as Dict).type === "text" && typeof (part as Dict).text === "string"
    ? [(part as Dict).text as string]
    : []).join("\n");
}

function dispatch(event: string, payload: Dict): string[] {
  try {
    return dispatchHook(event, payload).contexts;
  } catch {
    return [];
  }
}

const pending = new Map<string, string[]>();
const started = new Set<string>();

const server = async (input: Dict) => ({
  event: async (hook: Dict) => {
    const event = hook?.event ?? {};
    const sessionID = String(event?.properties?.sessionID ?? event?.properties?.info?.id ?? "");
    if (!sessionID) return;
    if (event.type === "session.deleted") {
      dispatch("SessionEnd", { session_id: sessionID, cwd: input.directory });
      pending.delete(sessionID);
      started.delete(sessionID);
    }
  },

  "chat.message": async (hook: Dict, output: Dict) => {
    const sessionID = String(hook?.sessionID ?? "");
    const contexts = dispatch("UserPromptSubmit", {
      session_id: sessionID,
      cwd: input.directory,
      prompt: textOf(output?.parts),
      message_id: hook?.messageID,
    });
    if (contexts.length) pending.set(sessionID, [...(pending.get(sessionID) ?? []), ...contexts]);
  },

  "experimental.chat.system.transform": async (hook: Dict, output: Dict) => {
    const sessionID = String(hook?.sessionID ?? "");
    const contexts: string[] = [];
    if (sessionID && !started.has(sessionID)) {
      started.add(sessionID);
      contexts.push(...dispatch("SessionStart", { session_id: sessionID, cwd: input.directory }));
    }
    const queued = sessionID ? pending.get(sessionID) : undefined;
    if (queued?.length) {
      contexts.push(...queued);
      pending.delete(sessionID);
    }
    if (!contexts.length || !Array.isArray(output?.system)) return;
    for (const text of [...new Set(contexts)]) output.system.push(text);
  },

  "tool.execute.after": async (hook: Dict, output: Dict) => {
    dispatch("PostToolUse", {
      session_id: String(hook?.sessionID ?? ""),
      cwd: input.directory,
      tool_name: hook?.tool,
      tool_input: hook?.args,
      tool_response: { title: output?.title, output: output?.output },
      call_id: hook?.callID,
    });
  },

  "experimental.session.compacting": async (hook: Dict, output: Dict) => {
    const contexts = dispatch("PreCompact", { session_id: String(hook?.sessionID ?? ""), cwd: input.directory });
    if (!Array.isArray(output?.context)) return;
    output.context.push(...contexts.map((text) => `Before this summary is finalized, preserve this as an explicit pending action. Do not imply the memory sync is already complete.\n\n${text}`));
  },
});

export default { id: "agent-memory", server };
