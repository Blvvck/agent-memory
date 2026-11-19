#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { promptFromPayload, wakeContext } from "../../core/wake";

function emit(text: string): void {
  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: text },
  })}\n`);
}

function main(): void {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(readFileSync(0, "utf8")) as Record<string, unknown>;
  } catch {
    return;
  }
  const prompt = promptFromPayload(payload);
  if (!prompt) return;
  const cwd = typeof payload.cwd === "string" ? payload.cwd : process.cwd();
  const context = wakeContext(prompt, cwd);
  if (context) emit(context);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    emit(`[Agent Memory wake blocked] ${reason} Stop before logging and resolve the project memory selection in .agent-memory-layout.`);
  }
}
