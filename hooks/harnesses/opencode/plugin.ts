import { dispatchWithSource } from "../../core/dispatch";

type Dict = Record<string, any>;

function asRecord(value: unknown): Dict {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Dict : {};
}

async function sessionPayload(ctx: Dict, event: Dict, toolName?: string): Promise<Dict> {
  const sessionId = event.sessionID || event.sessionId || event.session_id || "";
  let cwd = event.cwd || event.directory;
  if (!cwd && sessionId) {
    try {
      const session = await ctx.session.get({ sessionID: sessionId });
      cwd = session.directory || session.cwd;
    } catch {}
  }
  return {
    session_id: sessionId,
    cwd: cwd || ctx.location?.project?.directory || process.cwd(),
    ...(toolName ? { tool_name: toolName, tool_input: event.input || {} } : {}),
  };
}

function inject(event: Dict, contexts: string[]): void {
  for (const text of [...new Set(contexts)]) event.system.push({ type: "text", text });
}

function dispatch(eventName: string, payload: Dict): string[] {
  const result = dispatchWithSource("opencode", { ...payload, hook_event_name: eventName });
  return result.contexts;
}

function canonicalTool(name: string): string {
  return ({ bash: "Bash", edit: "Edit", write: "Write", apply_patch: "apply_patch", task: "Task", agent: "Agent", webfetch: "WebFetch", websearch: "WebSearch" } as Record<string, string>)[name.toLowerCase()] || name;
}

export default {
  id: "agent-memory",
  async setup(ctx: Dict) {
    const controller = new AbortController();
    void (async () => {
      for await (const item of ctx.event.subscribe({ types: ["session.idle"], signal: controller.signal })) {
        const data = asRecord(item.data);
        const sessionId = data.sessionID || data.sessionId || data.id || "";
        if (!sessionId) continue;
        dispatch("SessionEnd", await sessionPayload(ctx, { ...data, sessionID: sessionId }));
      }
    })().catch(() => undefined);

    await ctx.session.hook("prompt", async (event: Dict) => {
      const prompt = asRecord(event.prompt);
      const payload = await sessionPayload(ctx, event);
      dispatch("UserPromptSubmit", {
        ...payload,
        prompt: String(prompt.text || ""),
        message_id: event.messageID || event.messageId,
      });
    });

    await ctx.tool.hook("execute.after", async (event: Dict) => {
      const toolName = canonicalTool(String(event.tool || event.name || ""));
      const payload = await sessionPayload(ctx, event, toolName);
      dispatch(event.status === "error" ? "PostToolUseFailure" : "PostToolUseCapture", {
        ...payload,
        call_id: event.id || event.callID,
        error: event.status === "error" ? event.error : undefined,
      });
    });

    await ctx.session.hook("context", async (event: Dict) => {
      const payload = await sessionPayload(ctx, event);
      inject(event, [
        ...dispatch("SessionStart", payload),
        ...dispatch("PostToolUse", payload),
        ...dispatch("Stop", payload),
      ]);
    });

    await ctx.session.hook("compaction", async (event: Dict) => {
      const payload = await sessionPayload(ctx, event);
      const pending = dispatch("PreCompact", payload);
      inject(event, pending.map((text) => `Before this summary is finalized, preserve this as an explicit pending action. Do not imply the memory sync is already complete.\n\n${text}`));
    });

    return () => controller.abort();
  },
};
