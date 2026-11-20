#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ProtectedLogError, deleteEntry, editEntry, repairBackwardTrace, repairBulletTraceMarkers, repairEntryHeader, retagEntry, rewriteEntry, writeEntry } from "./protected-log";

function option(args: string[], name: string): string | undefined {
  const indexes = args.flatMap((arg, index) => arg === name ? [index] : []);
  if (indexes.length > 1) throw new ProtectedLogError(`${name} is repeated; pass it once`);
  if (!indexes.length) return undefined;
  const value = args[indexes[0] + 1];
  if (!value || value.startsWith("--")) throw new ProtectedLogError(`${name} requires a value`);
  return value;
}

function singleLine(value: string | undefined, path: string | undefined, flag: string, fileFlag: string): string | undefined {
  if (value !== undefined && path !== undefined) throw new ProtectedLogError(`pass either ${flag} or ${fileFlag}, not both`);
  if (!path) return value;
  const lines = readFileSync(resolve(path), "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 1) throw new ProtectedLogError(`${fileFlag} must contain exactly one non-empty line`);
  return lines[0];
}

function help(): void {
  process.stdout.write(
    "agent-log: write, correct, or remove one validated entry in a protected memory log.\n\n" +
    "Usage:\n" +
    "  agent-log --file PATH (--content TEXT | --content-file PATH) --trace 'HEADER' --agent NAME --cli RUNTIME --session-id ID [--project NAME]\n" +
    "  agent-log --file PATH --edit --header 'HEADER' (--content TEXT | --content-file PATH) --agent NAME --cli RUNTIME --session-id ID [--project NAME]\n" +
    "  agent-log --file PATH --rewrite --header 'HEADER' (--content TEXT | --content-file PATH) --agent NAME --cli RUNTIME --session-id ID [--project NAME]\n" +
    "  agent-log --file PATH --delete --header 'HEADER' --agent NAME --cli RUNTIME --session-id ID [--project NAME]\n\n" +
    "Modes:\n" +
    "  --edit       replace an entry's prose; subject, metadata, and trace lines stay\n" +
    "  --rewrite    replace an entry's subject and prose; metadata and trace lines stay, and references update\n" +
    "  --delete     remove an entry only when it traces to nothing and nothing traces to it\n" +
    "  --repair-entry, --repair-backward-trace, --repair-bullet-traces, --retag   narrow repairs\n\n" +
    "Use --trace 'none (new topic)' for an unrelated entry. An entry with trace links cannot be deleted; add a new entry that corrects it and pass its header as --trace.\n"
  );
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) { help(); return 0; }
  const json = args.includes("--json");
  try {
    const path = option(args, "--file");
    const inlineContent = option(args, "--content");
    const contentFile = option(args, "--content-file");
    const trace = option(args, "--trace");
    const agent = option(args, "--agent");
    const cli = option(args, "--cli");
    const sessionId = option(args, "--session-id") || process.env.AGENT_SESSION_ID || process.env.CODEX_SESSION_ID;
    const project = option(args, "--project");
    const headerPath = option(args, "--header-file");
    const replacementPath = option(args, "--replacement-file");
    const headerArg = option(args, "--header");
    const replacementArg = option(args, "--replacement");
    const header = singleLine(headerArg, headerPath, "--header", "--header-file");
    const replacement = singleLine(replacementArg, replacementPath, "--replacement", "--replacement-file");
    const edit = args.includes("--edit");
    const rewrite = args.includes("--rewrite");
    const remove = args.includes("--delete");
    const modes = [args.includes("--retag"), args.includes("--repair-backward-trace"), args.includes("--repair-entry"), args.includes("--repair-bullet-traces"), edit, rewrite, remove].filter(Boolean).length;
    if (modes > 1) throw new ProtectedLogError("choose one mutation mode");
    const runtime: Record<string, unknown> = { agent, cli, session_id: sessionId };
    if (project) runtime.project = project;
    if (edit) {
      if (!path || !header || (inlineContent === undefined) === (contentFile === undefined) || trace !== undefined || replacement !== undefined || !agent || !cli || !sessionId) throw new ProtectedLogError("edit requires --file, --header, exactly one of --content or --content-file, --agent, --cli, and --session-id");
      const content = contentFile ? readFileSync(resolve(contentFile), "utf8") : inlineContent!;
      const updated = editEntry(path, header, content, runtime);
      return emitSuccess(json, { ok: true, file: resolve(path), updated });
    }
    if (rewrite) {
      if (!path || !header || (inlineContent === undefined) === (contentFile === undefined) || trace !== undefined || replacement !== undefined || !agent || !cli || !sessionId) throw new ProtectedLogError("rewrite requires --file, --header, exactly one of --content or --content-file, --agent, --cli, and --session-id");
      const content = contentFile ? readFileSync(resolve(contentFile), "utf8") : inlineContent!;
      const updated = rewriteEntry(path, header, content, runtime);
      return emitSuccess(json, { ok: true, file: resolve(path), updated });
    }
    if (remove) {
      if (!path || !header || inlineContent !== undefined || contentFile !== undefined || trace !== undefined || replacement !== undefined || !agent || !cli || !sessionId) throw new ProtectedLogError("delete requires --file, --header, --agent, --cli, and --session-id");
      const deleted = deleteEntry(path, header, runtime);
      if (json) {
        process.stdout.write(`${JSON.stringify({ ok: true, file: resolve(path), deleted: deleted.header, entry: deleted.removed })}\n`);
        return 0;
      }
      process.stdout.write(`✓ Deleted from ${resolve(path)}\n\nRemoved:\n${deleted.removed.trimEnd()}\n`);
      return 0;
    }
    if (args.includes("--retag")) {
      if (!path || !header || !project || !agent || !cli || !sessionId) throw new ProtectedLogError("retag requires --file, --header, --project, --agent, --cli, and --session-id");
      const retagged = retagEntry(path, header, runtime);
      return emitSuccess(json, { ok: true, file: resolve(path), retagged });
    }
    if (args.includes("--repair-backward-trace")) {
      if (!path || !header || !trace || !agent || !cli || !sessionId) throw new ProtectedLogError("backward-trace repair requires --file, --header, --trace, --agent, --cli, and --session-id");
      const repaired = repairBackwardTrace(path, header, trace, runtime);
      return emitSuccess(json, { ok: true, file: resolve(path), repaired, target: trace });
    }
    if (args.includes("--repair-entry")) {
      if (!path || (headerArg === undefined) === (headerPath === undefined) || (replacementArg === undefined) === (replacementPath === undefined) || inlineContent !== undefined || contentFile !== undefined || trace !== undefined || !header || !replacement || !agent || !cli || !sessionId) throw new ProtectedLogError("entry repair requires one of --header/--header-file and one of --replacement/--replacement-file, plus --agent, --cli, and --session-id");
      const repaired = repairEntryHeader(path, header, replacement, runtime);
      return emitSuccess(json, { ok: true, file: resolve(path), repaired });
    }
    if (args.includes("--repair-bullet-traces")) {
      if (!path || !header || !agent || !cli || !sessionId) throw new ProtectedLogError("bullet-trace repair requires --file, --header, --agent, --cli, and --session-id");
      repairBulletTraceMarkers(path, header, runtime);
      return emitSuccess(json, { ok: true, file: resolve(path), repaired: header });
    }
    if (!path || (inlineContent === undefined) === (contentFile === undefined) || !trace || !agent || !cli || !sessionId) {
      throw new ProtectedLogError("provide --file, exactly one of --content or --content-file, --trace, --agent, --cli, and a real --session-id");
    }
    const content = contentFile ? readFileSync(resolve(contentFile), "utf8") : inlineContent!;
    const loggedHeader = writeEntry(path, content, runtime, trace);
    const renderedEntry = `${loggedHeader}\n${content.trim().split(/\r?\n/).slice(1).join("\n")}${content.trim().split(/\r?\n/).length > 1 ? "\n" : ""}${trace === "none (new topic)" ? "  - ↪ trace: none (new topic)" : `  - ↪ trace: relates-to ${trace}`}\n`;
    const output = { ok: true, file: resolve(path), header: loggedHeader, entry: renderedEntry };
    if (json) process.stdout.write(`${JSON.stringify(output)}\n`);
    else process.stdout.write(`✓ Logged to ${resolve(path)}\n\nContent written exactly as rendered:\n${renderedEntry}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nextSteps = error instanceof ProtectedLogError && error.nextSteps
      ? error.nextSteps
      : "Re-read the target, verify its canonical project and runtime metadata, and retry through agent-log.";
    const output = { ok: false, error: message, next_steps: nextSteps };
    if (json) process.stdout.write(`${JSON.stringify(output)}\n`);
    else process.stderr.write(`✗ Log rejected: ${message}\nNext steps: ${output.next_steps}\n`);
    return 2;
  }
}

function emitSuccess(json: boolean, result: Record<string, unknown>): number {
  if (json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else if (result.entry) process.stdout.write(`✓ Logged to ${result.file}\n\nContent written exactly as rendered:\n${result.entry}\n`);
  else if (result.updated) process.stdout.write(`✓ Updated ${result.file}\nTarget: ${result.updated}\n`);
  else if (result.repaired) process.stdout.write(`✓ Repaired ${result.file}\nTarget: ${result.target || result.repaired}\n`);
  else process.stdout.write(`✓ Updated ${result.file}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main();
