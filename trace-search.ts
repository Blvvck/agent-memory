#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

interface Entry {
  line: number;
  date: string;
  agent: string;
  session: string;
  title: string;
  start: number;
  raw: string;
}

interface Match extends Omit<Entry, "start" | "raw"> {
  matched_keywords: string[];
  trace_ref: string;
  trace_forward_template: string;
}

const entryPattern = /^\s*[-*]?\s*\[(\d{4}-\d{2}-\d{2})\].*?@(\w+).*?\[session:([^\]]+)\][:\s]*\*\*([^*]+)\*\*/gm;
const simpleEntryPattern = /^\s*[-*]?\s*\[(\d{4}-\d{2}-\d{2})\](?:\s*\[[^\]]+\])*\s*@(\w+)\s*\[session:([^\]]+)\][:\s]*(.+?)(?:\n|$)/gm;

function findEntries(filePath: string): Entry[] {
  const content = readFileSync(filePath, "utf8");
  const entries: Entry[] = [];
  entryPattern.lastIndex = 0;
  for (const match of content.matchAll(entryPattern)) {
    const start = match.index ?? 0;
    entries.push({
      line: content.slice(0, start).split("\n").length,
      date: match[1],
      agent: match[2],
      session: match[3],
      title: match[4].trim(),
      start,
      raw: match[0],
    });
  }

  simpleEntryPattern.lastIndex = 0;
  for (const match of content.matchAll(simpleEntryPattern)) {
    const start = match.index ?? 0;
    const line = content.slice(0, start).split("\n").length;
    if (entries.some((entry) => entry.line === line)) continue;
    let title = match[4].replace(/\*\*([^*]+)\*\*/g, "$1").split(".")[0].trim();
    if (title.length > 80) title = `${title.slice(0, 77)}...`;
    entries.push({ line, date: match[1], agent: match[2], session: match[3], title, start, raw: match[0] });
  }
  return entries.sort((left, right) => left.line - right.line);
}

function searchFile(filePath: string, keywords: string[]): Match[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf8").toLowerCase();
  const entries = findEntries(filePath);
  return entries.flatMap((entry, index) => {
    const end = entries[index + 1]?.start ?? content.length;
    const text = content.slice(entry.start, end);
    const matchedKeywords = keywords.map((keyword) => keyword.toLowerCase()).filter((keyword) => text.includes(keyword));
    if (!matchedKeywords.length) return [];
    return [{
      line: entry.line,
      date: entry.date,
      agent: entry.agent,
      session: entry.session,
      title: entry.title,
      matched_keywords: matchedKeywords,
      trace_ref: `[${entry.date}] @${entry.agent} [session:${entry.session}]: ${entry.title.slice(0, 60)}`,
      trace_forward_template: "  ↪ trace-forward: [DATE] @AGENT [session:SESSION]: NEW_TITLE",
    }];
  });
}

function expandPath(pathString: string): string {
  const expanded = pathString.startsWith("~") ? join(homedir(), pathString.slice(1)) : pathString;
  if (expanded.startsWith("/") || /^[A-Za-z]:[\\/]/.test(expanded)) return resolve(expanded);

  const agentsRoot = join(homedir(), ".agent-memory", "agents");
  let agentDirectories: string[] = [];
  try {
    const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
    agentDirectories = readdirSync(agentsRoot).filter((name) => statSync(join(agentsRoot, name)).isDirectory()).sort();
  } catch {
    agentDirectories = [];
  }
  const candidates = [
    ...agentDirectories.map((agent) => join(agentsRoot, agent, "brain", pathString)),
    join(homedir(), ".agent-memory", "comms", pathString),
    join(process.cwd(), ".agent-memory", "comms", pathString),
    join(process.cwd(), pathString),
  ];
  return resolve(candidates.find((candidate) => existsSync(candidate)) ?? expanded);
}

function printHelp(): void {
  process.stdout.write(
    "trace-search: Search tracked files for entries to link with bidirectional traces.\n\n" +
    "Usage: trace-search <file> <keyword...>\n" +
    "       trace-search --multi <file:kw1,kw2> [file:kw3,...]\n\n" +
    "Options: --json  Output JSON; --limit N  Max matches per file (default 10).\n",
  );
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) return printHelp();
  const multi = argv.includes("--multi");
  const json = argv.includes("--json");
  const limitIndex = argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number.parseInt(argv[limitIndex + 1] ?? "10", 10) : 10;
  const positional = argv.filter((arg, index) => !["--multi", "--json", "--limit"].includes(arg) && index !== limitIndex + 1);
  const results: Record<string, Match[]> = {};

  if (multi) {
    for (const spec of positional) {
      const separator = spec.lastIndexOf(":");
      if (separator < 0) {
        process.stderr.write(`Error: --multi requires format file:kw1,kw2 — got '${spec}'\n`);
        process.exitCode = 1;
        return;
      }
      const filePath = expandPath(spec.slice(0, separator));
      const keywords = spec.slice(separator + 1).split(",").map((value) => value.trim()).filter(Boolean);
      results[filePath] = searchFile(filePath, keywords).slice(0, limit);
    }
  } else {
    if (positional.length < 2) {
      process.stderr.write("Error: need at least file and one keyword\n");
      process.exitCode = 1;
      return;
    }
    const filePath = expandPath(positional[0]);
    results[filePath] = searchFile(filePath, positional.slice(1)).slice(0, limit);
  }

  if (json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    return;
  }

  let total = 0;
  for (const [filePath, matches] of Object.entries(results)) {
    if (!matches.length) continue;
    process.stdout.write(`\n## ${filePath} (${matches.length} matches)\n${"-".repeat(60)}\n`);
    for (const match of matches) {
      total += 1;
      process.stdout.write(`\nLine ${match.line}: ${match.trace_ref}\n`);
      process.stdout.write(`  Keywords: ${match.matched_keywords.join(", ")}\n`);
      process.stdout.write(`  To link this entry to your new entry, add to line ${match.line}:\n`);
      process.stdout.write("    ↪ trace-forward: [NEW_DATE] @[YOUR_AGENT] [session:NEW_SESSION]: [NEW_TITLE]\n");
    }
  }
  if (!total) process.stdout.write("\nNo matches found.\n");
  else {
    process.stdout.write(`\n---\nTotal: ${total} related entries found.\n`);
    process.stdout.write("For each match, edit the old entry to add a trace-forward line.\nThen add trace: relates-to lines on your new entry pointing back.\n");
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
