#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

type Status = "active" | "paused" | "archived" | "running" | "pending-approval";
type CreatedBy = "human" | "agent";
type Runner = "claude" | "codex" | "opencode" | "antigravity" | "cursor";

const DEFAULT_RUNNERS: Record<Runner, string[]> = {
  claude: ["claude", "-p", "{prompt}"],
  codex: ["codex", "exec", "{prompt}"],
  opencode: ["opencode", "run", "{prompt}"],
  antigravity: ["agy", "-p", "{prompt}"],
  cursor: ["cursor-agent", "-p", "{prompt}"],
};

interface ScheduleAt {
  type: "at";
  at: string;
}

interface ScheduleCron {
  type: "cron";
  expression: string;
}

interface Cron {
  id: string;
  agent: string;
  note: string;
  schedule: ScheduleAt | ScheduleCron;
  timezone: string;
  runner?: Runner;
  command?: string[];
  cwd?: string;
  timeoutSeconds: number;
  catchUp: "once" | "skip";
  createdBy: CreatedBy;
  status: Status;
  createdAt: string;
  nextRun: string;
  runningSince?: string;
  bodyPath?: string;
  lastRunAt?: string;
  lastExitCode?: number | null;
  lastOutput?: string;
  runCount: number;
  missedRuns: number;
}

interface Registry {
  version: 1;
  crons: Cron[];
}

interface Options {
  agent?: string;
  at?: string;
  cron?: string;
  timezone?: string;
  note?: string;
  runner?: Runner;
  command?: string[];
  cwd?: string;
  timeout: number;
  catchUp: "once" | "skip";
  createdBy?: CreatedBy;
  bodyPath?: string;
  json: boolean;
  all: boolean;
  interval: number;
  once: boolean;
  limit: number;
}

const ROOT = join(homedir(), ".agent-memory");
const REGISTRY = join(ROOT, "crons.json");
const LOCK = join(ROOT, "crons.lock");
const LOG = join(ROOT, "crons", "runs.jsonl");

function pathExists(path: string): boolean {
  try { statSync(path); return true; }
  catch { return false; }
}

function ensureRoot(): void {
  mkdirSync(ROOT, { recursive: true });
}

function withLock<T>(fn: () => T): T {
  ensureRoot();
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      mkdirSync(LOCK);
      break;
    } catch {
      try {
        if (Date.now() - statSync(LOCK).mtimeMs > 30_000) { rmdirSync(LOCK); continue; }
      } catch { /* lock vanished */ }
      const waitedUntil = Date.now() + 100;
      while (Date.now() < waitedUntil) { /* spin briefly */ }
      if (attempt === 49) throw new Error("crons registry is locked by another process.");
    }
  }
  try { return fn(); }
  finally { try { rmdirSync(LOCK); } catch { /* already released */ } }
}

function loadRegistry(): Registry {
  if (!pathExists(REGISTRY)) return { version: 1, crons: [] };
  const parsed: unknown = JSON.parse(readFileSync(REGISTRY, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("crons.json is not an object.");
  const registry = parsed as Registry;
  if (!Array.isArray(registry.crons)) throw new Error("crons.json is missing the crons array.");
  return registry;
}

function saveRegistry(registry: Registry): void {
  ensureRoot();
  const temporary = `${REGISTRY}.agent-memory-${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  renameSync(temporary, REGISTRY);
}

function newId(): string {
  return `crn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseArgs(args: string[]): Options {
  const options: Options = { timeout: 300, catchUp: "once", json: false, all: false, interval: 30, once: false, limit: 20 };
  const command: string[] = [];
  let jsonCommand: string[] | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--agent") options.agent = args[++index];
    else if (arg === "--at") options.at = args[++index];
    else if (arg === "--cron") options.cron = args[++index];
    else if (arg === "--timezone") options.timezone = args[++index];
    else if (arg === "--note") options.note = args[++index];
    else if (arg === "--runner") {
      const value = String(args[++index] ?? "").toLowerCase();
      if (!Object.hasOwn(DEFAULT_RUNNERS, value)) throw new Error("--runner must be claude, codex, opencode, antigravity, or cursor.");
      options.runner = value as Runner;
    } else if (arg === "--exec") command.push(String(args[++index] ?? ""));
    else if (arg === "--arg") command.push(String(args[++index] ?? ""));
    else if (arg === "--command") {
      try {
        const parsed: unknown = JSON.parse(String(args[++index] ?? ""));
        if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) throw new Error("not a string array");
        jsonCommand = parsed as string[];
      } catch { throw new Error("--command expects a JSON string array, such as '[\"node\",\"script.js\"]'."); }
    } else if (arg === "--cwd") options.cwd = args[++index];
    else if (arg === "--timeout") options.timeout = Math.max(1, Number(args[++index] ?? 300));
    else if (arg === "--limit") options.limit = Math.max(1, Number(args[++index] ?? 20));
    else if (arg === "--catch-up") {
      const value = String(args[++index] ?? "once");
      if (value !== "once" && value !== "skip") throw new Error("--catch-up must be once or skip.");
      options.catchUp = value;
    } else if (arg === "--as-agent") options.createdBy = "agent";
    else if (arg === "--as-human") options.createdBy = "human";
    else if (arg === "--body") options.bodyPath = args[++index];
    else if (arg === "--json") options.json = true;
    else if (arg === "--all") options.all = true;
    else if (arg === "--interval") options.interval = Math.max(1, Number(args[++index] ?? 30));
    else if (arg === "--once") options.once = true;
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(help());
      process.exit(0);
    } else if (!arg.startsWith("-")) continue;
    else throw new Error(`Unknown option '${arg}'.`);
  }
  if (command.length && jsonCommand) throw new Error("Use --exec/--arg or --command, not both.");
  options.command = command.length ? command : jsonCommand;
  return options;
}

function help(): string {
  return `agent-memory crons — scheduled command and agent runs

Usage:
  agent-memory crons list [--all] [--json]
  agent-memory crons add --agent NAME (--at ISO | --cron "m h dom mon dow") --note TEXT
      (--runner claude|codex|opencode|antigravity|cursor | --exec PATH [--arg VALUE]...)
      [--cwd PATH] [--timezone IANA] [--timeout SECONDS] [--catch-up once|skip] [--as-human|--as-agent] [--body PATH]
  agent-memory crons approve <id>
  agent-memory crons pause|resume|delete <id>
  agent-memory crons run <id>
  agent-memory crons logs [--limit N] [--json]
  agent-memory crons daemon [--once] [--interval SECONDS]

Crons are pending-approval by default. Pass --as-human to activate immediately. An agent must pass --as-agent, and a person runs approve before it fires.
`;
}

function validateSchedule(options: Options): ScheduleAt | ScheduleCron {
  if (!options.at && !options.cron) throw new Error("Provide --at or --cron.");
  if (options.at && options.cron) throw new Error("Provide either --at or --cron, not both.");
  if (options.at) {
    const at = new Date(options.at);
    if (Number.isNaN(at.getTime())) throw new Error(`Cannot read --at '${options.at}'. Use an ISO timestamp.`);
    return { type: "at", at: at.toISOString() };
  }
  const expression = String(options.cron).trim();
  if (!parseCron(expression)) throw new Error(`Cannot parse --cron '${expression}'. Use five fields: minute hour day month weekday.`);
  return { type: "cron", expression };
}

function commandOrRunner(options: Options): { command?: string[]; runner?: Runner } {
  if (options.runner) {
    if (options.command?.length) throw new Error("Use --runner or --exec/--command, not both.");
    return { runner: options.runner };
  }
  if (!options.command?.length) throw new Error("Provide --runner or --exec/--arg.");
  return { command: options.command };
}

function addCron(options: Options): Cron {
  if (!options.agent) throw new Error("Provide --agent.");
  if (!options.note?.trim()) throw new Error("Provide --note.");
  const schedule = validateSchedule(options);
  const target = commandOrRunner(options);
  const timezone = validateTimezone(options.timezone ?? localTimezone());
  const nextRun = nextRunFor(schedule, new Date(), timezone);
  const createdBy = options.createdBy ?? "agent";
  const status: Status = createdBy === "human" ? "active" : "pending-approval";
  const cron: Cron = {
    id: newId(),
    agent: options.agent,
    note: options.note.trim(),
    schedule,
    timezone,
    ...target,
    cwd: options.cwd ? resolve(options.cwd) : undefined,
    timeoutSeconds: options.timeout,
    catchUp: options.catchUp,
    createdBy,
    status,
    createdAt: nowIso(),
    nextRun: nextRun.toISOString(),
    bodyPath: options.bodyPath ? resolve(options.bodyPath) : join(ROOT, "agents", options.agent),
    runCount: 0,
    missedRuns: 0,
  };
  withLock(() => {
    const registry = loadRegistry();
    registry.crons.push(cron);
    saveRegistry(registry);
  });
  return cron;
}

function findCron(id: string): Cron {
  const registry = loadRegistry();
  const cron = registry.crons.find((item) => item.id === id || item.id.startsWith(id));
  if (!cron) throw new Error(`No cron matches '${id}'.`);
  return cron;
}

function updateCron(id: string, update: (cron: Cron) => void): Cron {
  return withLock(() => {
    const registry = loadRegistry();
    const cron = registry.crons.find((item) => item.id === id || item.id.startsWith(id));
    if (!cron) throw new Error(`No cron matches '${id}'.`);
    update(cron);
    saveRegistry(registry);
    return cron;
  });
}

function formatCron(cron: Cron): string {
  const schedule = cron.schedule.type === "at" ? cron.schedule.at : cron.schedule.expression;
  const target = cron.runner ? `agent:${cron.runner}` : (cron.command ?? []).join(" ");
  return `${cron.id.padEnd(24)} ${cron.agent.padEnd(12)} ${cron.status.padEnd(16)} ${schedule.padEnd(22)} @${cron.timezone.padEnd(16)} next ${cron.nextRun.slice(0, 16).replace("T", " ")}  ${target}`;
}

function listCrons(options: Options): void {
  const registry = loadRegistry();
  const crons = options.all ? registry.crons : registry.crons.filter((cron) => cron.status !== "archived");
  if (options.json) {
    process.stdout.write(`${JSON.stringify(crons, null, 2)}\n`);
    return;
  }
  if (!crons.length) {
    process.stdout.write("No crons.\n");
    return;
  }
  for (const cron of crons.sort((a, b) => a.nextRun.localeCompare(b.nextRun))) process.stdout.write(`${formatCron(cron)}\n`);
}

function approveCron(id: string): Cron {
  return updateCron(id, (cron) => {
    if (cron.status !== "pending-approval") throw new Error(`Cron ${cron.id} is ${cron.status}, not pending-approval.`);
    cron.status = "active";
    cron.nextRun = nextRunFor(cron.schedule, new Date(), cron.timezone).toISOString();
  });
}

function pauseCron(id: string): Cron {
  return updateCron(id, (cron) => {
    if (cron.status !== "active") throw new Error(`Cron ${cron.id} is ${cron.status}, not active.`);
    cron.status = "paused";
  });
}

function resumeCron(id: string): Cron {
  return updateCron(id, (cron) => {
    if (cron.status !== "paused") throw new Error(`Cron ${cron.id} is ${cron.status}, not paused.`);
    cron.status = "active";
    cron.nextRun = nextRunFor(cron.schedule, new Date(), cron.timezone).toISOString();
  });
}

function archiveCron(id: string): Cron {
  return updateCron(id, (cron) => { cron.status = "archived"; });
}

function parseCron(expression: string): number[][] | null {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
  const parsed: number[][] = [];
  for (let index = 0; index < 5; index++) {
    const values = parseField(fields[index], ranges[index][0], ranges[index][1]);
    if (!values) return null;
    parsed.push(values);
  }
  return parsed;
}

function parseField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = /^(.+)\/(\d+)$/.exec(part);
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    const base = stepMatch ? stepMatch[1] : part;
    if (!Number.isInteger(step) || step < 1) return null;
    let start: number;
    let end: number;
    if (base === "*") { start = min; end = max; }
    else if (/^\d+$/.test(base)) { start = Number(base); end = start; }
    else {
      const range = /^(\d+)-(\d+)$/.exec(base);
      if (!range) return null;
      start = Number(range[1]);
      end = Number(range[2]);
    }
    if (start < min || end > max || start > end) return null;
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return [...values].sort((a, b) => a - b);
}

function localTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}

function validateTimezone(timeZone: string): string {
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date()); return timeZone; }
  catch { throw new Error(`Unknown timezone '${timeZone}'. Use an IANA name such as Europe/London.`); }
}

function zonedParts(date: Date, timeZone: string): { minute: number; hour: number; day: number; month: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    minute: "2-digit",
    hour: "2-digit",
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    minute: Number(value("minute")),
    hour: Number(value("hour")) % 24,
    day: Number(value("day")),
    month: Number(value("month")),
    weekday: weekdays[value("weekday")] ?? 0,
  };
}

function nextRunFor(schedule: ScheduleAt | ScheduleCron, from: Date, timeZone = localTimezone()): Date {
  if (schedule.type === "at") {
    const at = new Date(schedule.at);
    return at > from ? at : new Date(from.getTime() + 60_000);
  }
  const parsed = parseCron(schedule.expression);
  if (!parsed) throw new Error(`Cannot parse cron '${schedule.expression}'.`);
  const [minutes, hours, days, months, weekdays] = parsed;
  const monthLengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!days.some((day) => months.some((month) => day <= monthLengths[month - 1]))) {
    throw new Error(`Cron '${schedule.expression}' selects a day that never occurs in the selected month.`);
  }
  const candidate = new Date(from.getTime() + 60_000);
  candidate.setUTCSeconds(0, 0);
  const limit = new Date(from.getTime() + 5 * 366 * 86_400_000);
  const domRestricted = schedule.expression.split(/\s+/)[2] !== "*";
  const dowRestricted = schedule.expression.split(/\s+/)[4] !== "*";
  while (candidate <= limit) {
    const { minute, hour, day, month, weekday } = zonedParts(candidate, timeZone);
    const domMatch = days.includes(day);
    const dowMatch = weekdays.includes(weekday);
    const dayMatch = domRestricted && dowRestricted ? domMatch || dowMatch : domMatch && dowMatch;
    if (minutes.includes(minute) && hours.includes(hour) && months.includes(month) && dayMatch) return new Date(candidate);
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  throw new Error("No matching run time within five years.");
}

function agentPrompt(cron: Cron): string {
  const body = cron.bodyPath ?? join(ROOT, "agents", cron.agent);
  return [
    `You are ${cron.agent}. This is a scheduled wake.`,
    `Before working, read your body at ${body}: soul.md, work.md, brain/memory.md, brain/learnings.md, and brain/patterns.md.`,
    `Task: ${cron.note}`,
    "When finished, record the result and next step with agent-log. Do not wait for a person.",
  ].join("\n");
}

function loadRunnerOverrides(): Partial<Record<Runner, string[]>> {
  const path = join(ROOT, "scheduler.json");
  if (!pathExists(path)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    const root = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    const raw = root.runners;
    const runners: Partial<Record<Runner, string[]>> = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (Array.isArray(value) && value.every((part) => typeof part === "string")) runners[key as Runner] = value as string[];
      }
    }
    return runners;
  } catch {
    return {};
  }
}

function runnerCommand(cron: Cron): string[] {
  if (cron.command?.length) return cron.command;
  if (!cron.runner) throw new Error(`Cron ${cron.id} has no runner or command.`);
  const template = loadRunnerOverrides()[cron.runner] ?? DEFAULT_RUNNERS[cron.runner];
  if (!template?.length) throw new Error(`No runner command configured for '${cron.runner}'. Set runners.${cron.runner} in ~/.agent-memory/scheduler.json.`);
  const prompt = agentPrompt(cron);
  const hasToken = template.some((part) => part.includes("{prompt}"));
  const parts = template.map((part) => part.split("{prompt}").join(prompt));
  return hasToken ? parts : [...parts, prompt];
}

function resolveWindowsCommand(command: string[]): string[] {
  const [executable, ...args] = command;
  if (process.platform !== "win32") return command;
  const comspec = process.env.ComSpec || "cmd.exe";
  if (/^cmd(\.exe)?$/i.test(executable)) return [comspec, ...args];
  if (/^node(\.exe)?$/i.test(executable)) return [process.execPath, ...args];
  let resolved = executable;
  if (!/[\\/]/.test(executable) && !/\.(exe|cmd|bat|com)$/i.test(executable)) {
    const found = spawnSync("where", [executable], { encoding: "utf8" });
    const first = found.status === 0 ? (found.stdout ?? "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) : "";
    if (first) resolved = first;
  }
  if (/\.(cmd|bat)$/i.test(resolved)) {
    const safeArgs = args.map((arg) => arg.replace(/\r?\n/g, " "));
    for (const arg of safeArgs) {
      if (/["&|<>^%!]/.test(arg)) {
        throw new Error("A Windows .cmd runner argument contains shell metacharacters. Use a native executable or command mode instead.");
      }
    }
    return [comspec, "/d", "/s", "/c", resolved, ...safeArgs];
  }
  return [resolved, ...args];
}

async function execute(cron: Cron): Promise<void> {
  const startedAt = nowIso();
  const [executable, ...args] = resolveWindowsCommand(runnerCommand(cron));
  const cwd = cron.cwd && pathExists(cron.cwd) ? cron.cwd : process.cwd();
  const result = await new Promise<{ code: number | null; output: string }>((resolvePromise) => {
    const hint = process.platform === "win32"
      ? " On Windows, a .cmd shim may need a scheduler.json runner override or command mode."
      : "";
    const child = spawn(executable, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"], timeout: cron.timeoutSeconds * 1000, killSignal: "SIGTERM" });
    let output = "";
    const collect = (chunk: Buffer) => { output += chunk.toString(); if (output.length > 20_000) output = output.slice(-20_000); };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => resolvePromise({ code: null, output: `${output}\n${error.message}${hint}` }));
    child.on("close", (code) => resolvePromise({ code, output }));
  });
  const finishedAt = nowIso();
  const tail = result.output.trim().slice(-4_000);
  mkdirSync(dirname(LOG), { recursive: true });
  appendFileSync(LOG, `${JSON.stringify({ id: cron.id, agent: cron.agent, startedAt, finishedAt, exitCode: result.code, output: tail })}\n`, "utf8");
  updateCron(cron.id, (current) => {
    current.status = "active";
    delete current.runningSince;
    current.lastRunAt = finishedAt;
    current.lastExitCode = result.code;
    current.lastOutput = tail;
    current.runCount += 1;
    if (current.schedule.type === "at") current.status = "archived";
    else current.nextRun = nextRunFor(current.schedule, new Date(), current.timezone).toISOString();
  });
  process.stdout.write(`[cron] ${cron.id} ${cron.agent} exit=${result.code ?? "error"} ${finishedAt}\n`);
  if (tail) process.stdout.write(`${tail.split("\n").slice(-5).join("\n")}\n`);
}

function claimCron(id: string): Cron {
  return withLock(() => {
    const registry = loadRegistry();
    const cron = registry.crons.find((item) => item.id === id || item.id.startsWith(id));
    if (!cron) throw new Error(`No cron matches '${id}'.`);
    if (cron.status !== "active") throw new Error(`Cron ${cron.id} is ${cron.status}; approve or resume it first.`);
    cron.status = "running";
    cron.runningSince = nowIso();
    saveRegistry(registry);
    return { ...cron };
  });
}

function claimDue(): Cron[] {  return withLock(() => {
    const registry = loadRegistry();
    const now = Date.now();
    const due: Cron[] = [];
    let changed = false;
    for (const cron of registry.crons) {
      if (cron.status === "running") {
        const age = cron.runningSince ? Date.now() - Date.parse(cron.runningSince) : Infinity;
        if (age > Math.max(600_000, cron.timeoutSeconds * 2000)) {
          cron.status = "active";
          delete cron.runningSince;
          changed = true;
        }
        continue;
      }
      if (cron.status !== "active") continue;
      if (Date.parse(cron.nextRun) > now) continue;
      const missed = cron.schedule.type === "cron" ? Math.max(0, Math.floor((now - Date.parse(cron.nextRun)) / 60_000)) : 0;
      cron.status = "running";
      cron.runningSince = nowIso();
      cron.missedRuns += missed;
      due.push({ ...cron });
      changed = true;
    }
    if (changed) saveRegistry(registry);
    return due;
  });
}

async function runDue(once: boolean): Promise<void> {
  const due = claimDue();
  for (const cron of due) {
    if (cron.catchUp === "skip" && Date.parse(cron.nextRun) < Date.now() - 60_000) {
      updateCron(cron.id, (current) => {
        current.status = current.schedule.type === "at" ? "archived" : "active";
        if (current.schedule.type === "cron") current.nextRun = nextRunFor(current.schedule, new Date(), current.timezone).toISOString();
      });
      process.stdout.write(`[cron] ${cron.id} skipped catch-up\n`);
      continue;
    }
    try {
      await execute(cron);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateCron(cron.id, (current) => {
        current.status = current.schedule.type === "at" ? "archived" : "active";
        delete current.runningSince;
        current.lastRunAt = nowIso();
        current.lastOutput = message;
        if (current.schedule.type === "cron") current.nextRun = nextRunFor(current.schedule, new Date(), current.timezone).toISOString();
      });
      process.stdout.write(`[cron] ${cron.id} failed: ${message}\n`);
    }
  }
  if (once && !due.length) process.stdout.write("[cron] nothing due\n");
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return;
  }
  const options = parseArgs(rest);
  switch (command) {
    case "list": listCrons(options); break;
    case "add": {
      const cron = addCron(options);
      process.stdout.write(`${cron.id}  ${cron.status}  next ${cron.nextRun}\n`);
      if (cron.status === "pending-approval") process.stderr.write(`Approve with: agent-memory crons approve ${cron.id}\n`);
      break;
    }
    case "approve": if (!rest[0]) throw new Error("Provide a cron id."); process.stdout.write(`${approveCron(rest[0]).id} active\n`); break;
    case "pause": if (!rest[0]) throw new Error("Provide a cron id."); process.stdout.write(`${pauseCron(rest[0]).id} paused\n`); break;
    case "resume": if (!rest[0]) throw new Error("Provide a cron id."); process.stdout.write(`${resumeCron(rest[0]).id} active\n`); break;
    case "delete": if (!rest[0]) throw new Error("Provide a cron id."); process.stdout.write(`${archiveCron(rest[0]).id} archived\n`); break;
    case "run": {
      if (!rest[0]) throw new Error("Provide a cron id.");
      const cron = claimCron(rest[0]);
      try {
        await execute(cron);
      } catch (error) {
        updateCron(cron.id, (current) => {
          current.status = current.schedule.type === "at" ? "archived" : "active";
          delete current.runningSince;
          current.lastRunAt = nowIso();
          current.lastOutput = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
      break;
    }
    case "logs": {
      if (!pathExists(LOG)) { process.stdout.write("No runs.\n"); break; }
      const lines = readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).slice(-options.limit);
      if (options.json) process.stdout.write(`[${lines.join(",")}]\n`);
      else for (const line of lines) {
        try {
          const run = JSON.parse(line) as Record<string, unknown>;
          process.stdout.write(`${String(run.finishedAt ?? "")}  ${String(run.id ?? "")}  exit=${String(run.exitCode ?? "error")}  ${String(run.output ?? "").split("\n")[0].slice(0, 100)}\n`);
        } catch { continue; }
      }
      break;
    }
    case "daemon": {
      process.stdout.write(`[cron] daemon every ${options.interval}s${options.once ? " (once)" : ""}\n`);
      do {
        await runDue(options.once);
        if (options.once) break;
        await new Promise((resolvePromise) => setTimeout(resolvePromise, options.interval * 1000));
      } while (true);
      break;
    }
    default: throw new Error(`Unknown command '${command}'.`);
  }
}

export function runCrons(args: string[]): void {
  mainWithArgs(args).catch((error) => {
    process.stderr.write(`agent-memory crons: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  });
}

async function mainWithArgs(args: string[]): Promise<void> {
  const previous = process.argv;
  process.argv = [previous[0], previous[1], ...args];
  try { await main(); }
  finally { process.argv = previous; }
}

if (require.main === module) runCrons(process.argv.slice(2));
