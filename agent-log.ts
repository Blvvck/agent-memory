#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ProtectedLogError, repairBackwardTrace, repairBulletTraceMarkers, repairEntryHeader, retagEntry, writeEntry } from "./protected-log";

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
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
  process.stdout.write("agent-log: write a timestamped protected memory entry with a reciprocal trace.\n\nUsage: agent-log --file PATH (--content TEXT | --content-file PATH) --trace 'HEADER' --agent NAME --cli RUNTIME --session-id ID [--project NAME]\n\nUse --trace 'none (new topic)' for an unrelated entry.\n");
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
    const modes = [args.includes("--retag"), args.includes("--repair-backward-trace"), args.includes("--repair-entry"), args.includes("--repair-bullet-traces")].filter(Boolean).length;
    if (modes > 1) throw new ProtectedLogError("choose one repair mode");
    const runtime: Record<string, unknown> = { agent, cli, session_id: sessionId };
    if (project) runtime.project = project;
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
      if (!path || !header) throw new ProtectedLogError("bullet-trace repair requires --file and --header");
      repairBulletTraceMarkers(path, header);
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
    const output = { ok: false, error: message, next_steps: "Re-read the target, verify its canonical project and runtime metadata, and retry through agent-log." };
    if (json) process.stdout.write(`${JSON.stringify(output)}\n`);
    else process.stderr.write(`✗ Log rejected: ${message}\nNext steps: ${output.next_steps}\n`);
    return 2;
  }
}

function emitSuccess(json: boolean, result: Record<string, unknown>): number {
  if (json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else if (result.entry) process.stdout.write(`✓ Logged to ${result.file}\n\nContent written exactly as rendered:\n${result.entry}\n`);
  else if (result.repaired) process.stdout.write(`✓ Repaired ${result.file}\nTarget: ${result.target || result.repaired}\n`);
  else process.stdout.write(`✓ Updated ${result.file}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main();
