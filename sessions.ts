#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

type Harness = "claude" | "codex" | "opencode" | "antigravity" | "cursor";

interface Message {
  role: string;
  text: string;
  timestamp?: string | number;
}

interface SessionRecord {
  harness: Harness;
  id: string;
  title: string;
  project: string;
  updatedAt?: string;
  path?: string;
  messageCount?: number;
}

interface Options {
  list: boolean;
  search: string[];
  harness?: Harness;
  project?: string;
  since?: number;
  limit: number;
  context: number;
  json: boolean;
}

const harnesses: Harness[] = ["claude", "codex", "opencode", "antigravity", "cursor"];

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.flatMap((part) => {
    const block = asObject(part);
    return block && block.type === "text" && typeof block.text === "string" ? [block.text] : [];
  }).join("\n");
}

function parseOptions(args: string[]): Options {
  const options: Options = { list: false, search: [], limit: 20, context: 2, json: false };
  const words: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--list" || arg === "-l") options.list = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--search" || arg === "-s") options.search.push(args[++index] ?? "");
    else if (arg === "--harness") {
      const value = String(args[++index] ?? "").toLowerCase() as Harness;
      if (!harnesses.includes(value)) throw new Error(`Unknown harness '${value}'. Choose ${harnesses.join(", ")}.`);
      options.harness = value;
    } else if (arg === "--project") options.project = args[++index] ?? "";
    else if (arg === "--since") options.since = parseSince(args[++index] ?? "");
    else if (arg === "--limit") options.limit = Math.max(1, Number(args[++index] ?? 20));
    else if (arg === "--context") options.context = Math.max(0, Number(args[++index] ?? 2));
    else if (arg.startsWith("-")) throw new Error(`Unknown option '${arg}'.`);
    else words.push(arg);
  }
  if (words.length) options.search.push(...words);
  options.search = options.search.map((word) => word.trim()).filter(Boolean);
  if (!options.list && !options.search.length) options.list = true;
  return options;
}

function parseSince(value: string): number {
  const now = Date.now();
  const match = /^(\d+)([hdw])$/i.exec(value.trim());
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const ms = unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 604_800_000;
    return now - amount * ms;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`Cannot read date '${value}'. Use 3h, 2d, 1w, or YYYY-MM-DD.`);
  return parsed;
}

let sqliteCli: boolean | undefined;
function hasSqliteCli(): boolean {
  if (sqliteCli === undefined) sqliteCli = spawnSync("sqlite3", ["-version"], { encoding: "utf8" }).status === 0;
  return sqliteCli;
}

function querySqlite(path: string, sql: string): Record<string, unknown>[] {
  if (!existsSync(path)) return [];
  if (hasSqliteCli()) {
    const result = spawnSync("sqlite3", ["-json", path, sql], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0 || !result.stdout.trim()) return [];
    try { return JSON.parse(result.stdout) as Record<string, unknown>[]; }
    catch { return []; }
  }
  try {
    const sqlite = require("node:sqlite") as { DatabaseSync: new (path: string, options?: { readOnly?: boolean }) => { prepare: (sql: string) => { all: () => Record<string, unknown>[] }; close: () => void } };
    const database = new sqlite.DatabaseSync(path, { readOnly: true });
    try { return database.prepare(sql).all(); }
    finally { database.close(); }
  } catch { return []; }
}

function newestByMtime(paths: string[]): string | undefined {
  let best: string | undefined;
  let bestTime = -1;
  for (const path of paths) {
    try {
      const time = statSync(path).mtimeMs;
      if (time > bestTime) { best = path; bestTime = time; }
    } catch { continue; }
  }
  return best;
}

function sqlLike(term: string): string {
  return `%${term.replace(/'/g, "''")}%`;
}

function truncate(text: string, length = 100): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}

function matchesProject(record: SessionRecord, filter?: string): boolean {
  if (!filter) return true;
  return `${record.project} ${record.title}`.toLowerCase().includes(filter.toLowerCase());
}

function withinSince(record: SessionRecord, since?: number): boolean {
  if (!since || !record.updatedAt) return true;
  const time = Date.parse(record.updatedAt);
  return Number.isNaN(time) || time >= since;
}

function sessionTime(record: SessionRecord): number {
  const time = record.updatedAt ? Date.parse(record.updatedAt) : 0;
  return Number.isNaN(time) ? 0 : time;
}

function claudeSessions(): SessionRecord[] {
  const root = process.env.CLAUDE_CONFIG_DIR
    ? join(process.env.CLAUDE_CONFIG_DIR, "projects")
    : join(homedir(), ".claude", "projects");
  if (!existsSync(root)) return [];
  const records: SessionRecord[] = [];
  for (const project of readdirSync(root, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    const directory = join(root, project.name);
    for (const file of readdirSync(directory)) {
      if (!file.endsWith(".jsonl")) continue;
      const path = join(directory, file);
      const stat = statSync(path);
      records.push({
        harness: "claude",
        id: basename(file, ".jsonl"),
        title: "",
        project: project.name,
        updatedAt: stat.mtime.toISOString(),
        path,
      });
    }
  }
  return records.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function claudeTitle(path: string): string {
  let text: string;
  try { text = readFileSync(path, "utf8"); }
  catch { return "Claude session"; }
  let seen = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    if (++seen > 300) break;
    try {
      const event = asObject(JSON.parse(line));
      if (!event) continue;
      const message = asObject(event.message);
      const role = message && typeof message.role === "string" ? message.role : typeof event.type === "string" ? event.type : "";
      if (role !== "user") continue;
      const body = textFromContent(message?.content ?? event.content);
      if (body.trim()) return truncate(body);
    } catch { continue; }
  }
  return "Claude session";
}

function claudeMessages(path: string): Message[] {
  const messages: Message[] = [];
  let text: string;
  try { text = readFileSync(path, "utf8"); }
  catch { return messages; }
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let event: JsonObject | null;
    try { event = asObject(JSON.parse(line)); }
    catch { continue; }
    if (!event) continue;
    const message = asObject(event.message);
    const role = message && typeof message.role === "string" ? message.role : typeof event.type === "string" ? event.type : "";
    if (role !== "user" && role !== "assistant") continue;
    const body = textFromContent(message?.content ?? event.content);
    if (body.trim()) messages.push({ role, text: body, timestamp: typeof event.timestamp === "string" ? event.timestamp : undefined });
  }
  return messages;
}

function codexText(itemType: string, itemJson: string): string {
  try {
    const item = asObject(JSON.parse(itemJson));
    if (!item) return "";
    if (itemType === "agentMessage") return typeof item.text === "string" ? item.text : "";
    if (itemType === "userMessage") {
      const content = item.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content.flatMap((part) => {
          const block = asObject(part);
          return block && typeof block.text === "string" ? [block.text] : [];
        }).join("\n");
      }
    }
    return "";
  } catch { return ""; }
}

function codexDatabases(): string[] {
  const root = process.env.CODEX_HOME || join(homedir(), ".codex");
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((name) => /^thread_history_\d+\.sqlite$/.test(name)).map((name) => join(root, name));
}

function codexSessions(): SessionRecord[] {
  const records = new Map<string, SessionRecord>();
  for (const database of codexDatabases()) {
    const rows = querySqlite(database, "SELECT thread_id, MAX(COALESCE(completed_at, started_at)) AS updated FROM thread_turns GROUP BY thread_id");
    for (const row of rows) {
      const id = String(row.thread_id);
      const updatedAt = row.updated ? new Date(Number(row.updated) * 1000).toISOString() : undefined;
      const existing = records.get(id);
      if (!existing || (updatedAt && (!existing.updatedAt || updatedAt > existing.updatedAt))) {
        records.set(id, {
          harness: "codex",
          id,
          title: existing?.title ?? "",
          project: "codex",
          updatedAt,
          path: database,
        });
      }
    }
  }
  return [...records.values()];
}

function codexTitle(id: string): string {
  for (const database of codexDatabases()) {
    const rows = querySqlite(database, `SELECT item_json FROM thread_items WHERE thread_id='${id.replace(/'/g, "''")}' AND item_type='userMessage' ORDER BY created_at_ms LIMIT 1`);
    const text = rows.length ? codexText("userMessage", String(rows[0].item_json)) : "";
    if (text) return truncate(text);
  }
  return "Codex thread";
}

function codexMessages(id: string): Message[] {
  for (const database of codexDatabases()) {
    const rows = querySqlite(database, `SELECT item_type, item_json, created_at_ms FROM thread_items WHERE thread_id='${id.replace(/'/g, "''")}' AND item_type IN ('userMessage','agentMessage') ORDER BY created_at_ms`);
    if (!rows.length) continue;
    return rows.flatMap((row) => {
      const text = codexText(String(row.item_type), String(row.item_json));
      return text.trim() ? [{ role: row.item_type === "userMessage" ? "user" : "assistant", text, timestamp: Number(row.created_at_ms) }] : [];
    });
  }
  return [];
}

function opencodeDatabase(): string {
  const dataHome = process.env.XDG_DATA_HOME
    || (process.platform === "win32"
      ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"))
      : join(homedir(), ".local", "share"));
  return join(dataHome, "opencode", "opencode.db");
}

function opencodeSessions(): SessionRecord[] {
  const database = opencodeDatabase();
  if (!existsSync(database)) return [];
  const rows = querySqlite(database, "SELECT id, title, directory, time_created, time_updated FROM session ORDER BY time_updated DESC");
  return rows.map((row) => ({
    harness: "opencode" as Harness,
    id: String(row.id),
    title: truncate(String(row.title || "OpenCode session")),
    project: String(row.directory || "opencode"),
    updatedAt: row.time_updated ? new Date(Number(row.time_updated)).toISOString() : undefined,
    path: database,
  }));
}

function opencodeMessages(id: string): Message[] {
  const database = opencodeDatabase();
  if (!existsSync(database)) return [];
  const rows = querySqlite(database, `SELECT p.data AS data, p.time_created AS created, m.data AS message FROM part p JOIN message m ON m.id=p.message_id WHERE p.session_id='${id.replace(/'/g, "''")}' ORDER BY p.time_created`);
  const messages: Message[] = [];
  for (const row of rows) {
    try {
      const part = asObject(JSON.parse(String(row.data)));
      if (!part || part.type !== "text" || typeof part.text !== "string" || !part.text.trim()) continue;
      const message = asObject(JSON.parse(String(row.message)));
      messages.push({ role: message && typeof message.role === "string" ? message.role : "assistant", text: part.text, timestamp: Number(row.created) });
    } catch { continue; }
  }
  return messages;
}

function antigravityDatabase(): string {
  return join(homedir(), ".gemini", "antigravity-cli", "conversation_summaries.db");
}

function antigravitySessions(): SessionRecord[] {
  const database = antigravityDatabase();
  if (!existsSync(database)) return [];
  const rows = querySqlite(database, "SELECT conversation_id, title, preview, last_modified_time, workspace_uris FROM conversation_summaries ORDER BY last_modified_time DESC");
  return rows.map((row) => {
    const parsed = row.last_modified_time ? new Date(String(row.last_modified_time)) : null;
    return {
      harness: "antigravity" as Harness,
      id: String(row.conversation_id || ""),
      title: truncate(String(row.title || row.preview || "Antigravity conversation")),
      project: String(row.workspace_uris || "antigravity"),
      updatedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : undefined,
      path: database,
    };
  });
}

function antigravityMessages(id: string): Message[] {
  const database = antigravityDatabase();
  if (!existsSync(database)) return [];
  const rows = querySqlite(database, `SELECT title, preview FROM conversation_summaries WHERE conversation_id='${id.replace(/'/g, "''")}'`);
  return rows.map((row) => ({ role: "summary", text: `${row.title ?? ""}\n${row.preview ?? ""}`.trim() }));
}

function cursorDatabases(): string[] {
  const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
  const roots = [
    join(homedir(), "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb"),
    join(homedir(), ".config", "Cursor", "User", "globalStorage", "state.vscdb"),
    join(appData, "Cursor", "User", "globalStorage", "state.vscdb"),
  ];
  const found: string[] = [];
  for (const root of roots) if (existsSync(root)) found.push(root);
  const workspaceRoots = [
    join(homedir(), "Library", "Application Support", "Cursor", "User", "workspaceStorage"),
    join(homedir(), ".config", "Cursor", "User", "workspaceStorage"),
    join(appData, "Cursor", "User", "workspaceStorage"),
  ];
  for (const root of workspaceRoots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = join(root, entry.name, "state.vscdb");
      if (existsSync(candidate)) found.push(candidate);
    }
  }
  return found;
}

function cursorSessions(): SessionRecord[] {
  const records: SessionRecord[] = [];
  for (const database of cursorDatabases()) {
    const rows = querySqlite(database, "SELECT key FROM cursorDiskKV WHERE key LIKE 'composerData:%' LIMIT 200");
    for (const row of rows) {
      records.push({
        harness: "cursor" as Harness,
        id: String(row.key).replace("composerData:", ""),
        title: "Cursor composer",
        project: "cursor",
        path: database,
      });
    }
  }
  return records;
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === "string") {
    if (value.length > 200_000) return [];
    try { return collectStrings(JSON.parse(value), depth + 1); }
    catch { return [value]; }
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
  const object = asObject(value);
  if (object) return Object.values(object).flatMap((item) => collectStrings(item, depth + 1));
  return [];
}

function cursorMessages(id: string): Message[] {
  for (const database of cursorDatabases()) {
    const rows = querySqlite(database, `SELECT value FROM cursorDiskKV WHERE key='composerData:${id.replace(/'/g, "''")}'`);
    if (!rows.length) continue;
    const text = collectStrings(rows[0].value).join("\n");
    return text.trim() ? [{ role: "cursor", text }] : [];
  }
  return [];
}

function adapters(): Record<Harness, { list: () => SessionRecord[]; messages: (id: string) => Message[] }> {
  return {
    claude: { list: claudeSessions, messages: (id) => {
      const record = claudeSessions().find((session) => session.id === id);
      return record?.path ? claudeMessages(record.path) : [];
    } },
    codex: { list: codexSessions, messages: codexMessages },
    opencode: { list: opencodeSessions, messages: opencodeMessages },
    antigravity: { list: antigravitySessions, messages: antigravityMessages },
    cursor: { list: cursorSessions, messages: cursorMessages },
  };
}

function searchSessions(options: Options): void {
  const selected = options.harness ? [options.harness] : harnesses;
  const registry = adapters();
  const terms = options.search.map((term) => term.toLowerCase());
  const candidates = selected
    .flatMap((harness) => registry[harness].list().map((session) => ({ session, adapter: registry[harness] })))
    .filter(({ session }) => matchesProject(session, options.project) && withinSince(session, options.since))
    .sort((a, b) => sessionTime(b.session) - sessionTime(a.session));
  let printed = 0;
  for (const { session, adapter } of candidates.slice(0, Math.max(options.limit * 50, 300))) {
    if (session.harness === "claude" && session.path) {
      try {
        const raw = readFileSync(session.path, "utf8").toLowerCase();
        if (!terms.every((term) => raw.includes(term))) continue;
      } catch { continue; }
    }
    const messages = adapter.messages(session.id);
    const sessionText = `${session.title}\n${messages.map((message) => message.text).join("\n")}`.toLowerCase();
    if (!terms.every((term) => sessionText.includes(term))) continue;
    const hits = messages.flatMap((message, index) => terms.some((term) => message.text.toLowerCase().includes(term)) ? [{ index, text: message.text }] : []);
    const titleHit = terms.every((term) => session.title.toLowerCase().includes(term));
    if (!hits.length && !titleHit) continue;
    if (!hits.length) hits.push({ index: 0, text: session.title });
    printed++;
    if (!session.title && session.harness === "claude" && session.path) session.title = claudeTitle(session.path);
    if (!session.title && session.harness === "codex") session.title = codexTitle(session.id);
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ session, hits: hits.map((hit) => messages.slice(Math.max(0, hit.index - options.context), hit.index + options.context + 1)) })}\n`);
      continue;
    }
    process.stdout.write(`\n${session.harness}  ${session.updatedAt?.slice(0, 10) ?? ""}  ${session.id.slice(0, 12)}  ${session.project}\n  ${session.title}\n`);
    for (const hit of hits.slice(0, 3)) {
      const window = messages.slice(Math.max(0, hit.index - options.context), hit.index + options.context + 1);
      for (const message of window) process.stdout.write(`    ${message.role}: ${truncate(message.text, 160)}\n`);
      process.stdout.write("    ---\n");
    }
    if (printed >= options.limit) break;
  }
  if (!printed && !options.json) process.stdout.write("No matching sessions.\n");
}

function listSessions(options: Options): void {
  const selected = options.harness ? [options.harness] : harnesses;
  const records: SessionRecord[] = [];
  for (const harness of selected) records.push(...adapters()[harness].list());
  const filtered = records
    .filter((record) => matchesProject(record, options.project) && withinSince(record, options.since))
    .sort((a, b) => sessionTime(b) - sessionTime(a))
    .slice(0, options.limit);
  for (const record of filtered) {
    if (!record.title && record.harness === "claude" && record.path) record.title = claudeTitle(record.path);
    if (!record.title && record.harness === "codex") record.title = codexTitle(record.id);
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(filtered, null, 2)}\n`);
    return;
  }
  if (!filtered.length) {
    process.stdout.write("No sessions found.\n");
    return;
  }
  for (const record of filtered) {
    const date = record.updatedAt?.slice(0, 16).replace("T", " ") ?? "";
    process.stdout.write(`${record.harness.padEnd(11)} ${date}  ${record.id.slice(0, 12).padEnd(13)} ${truncate(record.project, 28).padEnd(29)} ${record.title}\n`);
  }
}

export function runSessions(args: string[]): void {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`agent-memory sessions — list or search local harness sessions

Usage:
  agent-memory sessions --list [--harness name] [--project text] [--since 7d] [--limit N]
  agent-memory sessions --search "words" [--harness name] [--context N] [--json]

Harnesses: claude, codex, opencode, antigravity, cursor.
`);
    return;
  }
  try {
    const options = parseOptions(args);
    if (options.search.length) searchSessions(options);
    else listSessions(options);
  } catch (error) {
    process.stderr.write(`agent-memory sessions: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) runSessions(process.argv.slice(2));
