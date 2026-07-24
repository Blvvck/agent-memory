# agent-memory

A scaffold for giving an AI agent a persistent memory and a body, so its next session starts where the last one ended instead of blank.

## What's in the box

| Piece | What it is | When you touch it |
|-------|-----------|-------------------|
| `AGENTS.md` | The single entry point every harness loads | Once, at setup |
| `.agents/example/` | A full agent body template (identity + memory) | Copy it per agent, then edit |
| `agent-log` | The validated writer for memory files | Every time an agent writes a trace |
| `hooks/core/` | Shared dispatch and memory rules for protected writes, spawn requirements, traces, and brain sync | Invoked by harness adapters |
| `hooks/harnesses/` | Harness-specific adapters grouped by runtime | Once, when you wire your harness |
| `examples/scaffold/` | Global and project memory files, with optional team-planning templates | Copy the default files; add optional modules when useful |
| `examples/protocols/` | Harness-neutral examples for session sync, subagent wake, and memory entries | Copy and adapt only the procedures you need |
| `settings.example.json` | The hook wiring for Claude Code | Once, when you configure hooks |
| `agent-memory init` | Guided setup for global memory, a project, optional team modules, and selected harnesses | After installation, or whenever you add another project or harness |

## The loop

An agent works in a loop:

1. **Wake** — read its body (identity first, then recent memory) in slices.
2. **Work** — do the task, and write a short trace after each meaningful step.
3. **Sleep** — final sync, and link entries both ways with traces.

The agent improves because its next session reads what its last session wrote.

## Runtime

The runtime is TypeScript compiled to JavaScript and requires Node.js 18 or later. The published npm package includes the compiled runtime, so users do not need Python or a TypeScript compiler.

## Setup

### 1. Install and start setup

Install the package, then run the guided setup from the project you want to equip:

```bash
npm install -g @blvvck/agent-memory
agent-memory init
```

Or run it once without a global install:

```bash
npx @blvvck/agent-memory init
```

The installer creates `~/.agent-memory/` for shared agent memory and offers one project memory layout: portable `AGENTS.md` + `.agent-memory/`, Claude `CLAUDE.md` + `.claude/`, Codex `AGENTS.md` + `.codex/`, OpenCode `AGENTS.md` + `.opencode/`, Antigravity `GEMINI.md` + `.agents/`, or Cursor `AGENTS.md` + `.cursor/`. Each project keeps exactly one of those memory directories, selected in `.agent-memory-layout`. You can connect multiple harnesses, but they all read and write that same selected memory; running setup with a conflicting layout is rejected so it cannot create a second memory tree. Setup then asks which optional team files you want and which harnesses to connect. You can also choose a layout and harness directly:

```bash
agent-memory init --layout codex --harness codex
```

When a project is selected, setup writes hook configuration in the harness's native project location:

| Harness | Project instructions | Project hooks or plugin |
|---------|----------------------|-------------------------|
| Claude Code | `CLAUDE.md` or supported `AGENTS.md` | `.claude/settings.json` |
| Codex | `AGENTS.md` | `.codex/hooks.json` |
| OpenCode | `AGENTS.md` | `.opencode/plugins/` |
| Antigravity | `GEMINI.md` or `AGENTS.md` | `.agents/hooks.json` |
| Cursor | `AGENTS.md` | `.cursor/hooks.json` |

Existing JSON hook settings are backed up before a merge, and existing instruction files are kept intact. Cursor project hooks run in trusted workspaces; Cursor also loads root `AGENTS.md` instructions and receives shared wake instructions from the session-start hook. The Cursor stop hook only submits a follow-up for a blocking error, not for advisory sync reminders. Global-only Cursor hooks in `~/.cursor/hooks.json` are local to that machine; Cursor Cloud Agents load project hooks from `.cursor/hooks.json`, so run project setup in each repository you want to use in the cloud. For Codex, review and trust project hooks in `/hooks`, then restart the harness to load its instructions.

Use `agent-memory init --help` for project, global-only, layout, optional module, and agent-body options. `agent-memory init --project --layout standard --work --team --harness opencode` is one non-interactive example. To create a body scoped to the selected project layout, use `agent-memory init --project --layout claude --harness claude --agent godel --agent-scope project`; omit `--agent-scope project` to create the shared global body.

### 2. Give an agent its identity

During setup, you can create a starter body by name. Choose global scope for a shared agent or project scope for an agent stored under `agents/<name>/` in the selected project memory directory. To create one later, copy the example body into the matching location. A project-specific body takes precedence over a shared body with the same name:

```bash
cp -r ~/.agent-memory/.agents/example ~/.agent-memory/agents/my-agent
```

Fill in `soul.md` (identity), `heart.md` (who it works with), and `work.md` (its role). The `brain/` files start nearly empty and grow as the agent writes.

### 3. Understand the scaffold

The copyable templates are in `examples/scaffold/`. They include global activity, notifications, lounge, tasks, and leaderboard files, plus project context, activity, and ideas. Project work planning (`work/SPRINT.md`, `work/BACKLOG.md`, and `work/features/`) and project lounge/leaderboard files are separate optional modules. Copy only the modules you want; no `comms/` directory or project `COMMANDS.md` is required.

### 4. Hook and harness behavior

`settings.example.json`, `codex-hooks.example.json`, `antigravity-hooks.example.json`, and `cursor-hooks.example.json` show the Claude Code, Codex, Antigravity, and Cursor wiring. Cursor project hooks live in `.cursor/hooks.json`; Cursor supports `preCompact` reminders, while its session start/end hooks do not run in cloud agents. Harness adapters live under `hooks/harnesses/<harness>/` and translate lifecycle events into shared memory checks in `hooks/core/`. OpenCode uses the V2 plugin at `dist/hooks/harnesses/opencode/plugin.js`; project setup links it under `.opencode/plugins/`, while global-only setup links it under `~/.config/opencode/plugins/`. The examples invoke compiled JavaScript under `dist/`.

Brain sync captures prompts and completed tool calls in a per-session journal, then checks at harness lifecycle points: Claude Code and Codex can issue pre-compaction reminders, Cursor uses an advisory `preCompact` reminder and only submits a `stop` or `subagentStop` follow-up for blocking errors, OpenCode adds a sync action to its compaction summary, and Antigravity uses its pre/post invocation and stop hooks because it has no compaction event. Cursor cannot block or change compaction, and its session start/end hooks are unavailable to Cloud Agents. New sessions automatically recover stale sessions whose final lifecycle hook did not run; `agent-memory-heartbeat` can scan periodically as a standalone process (`agent-memory-heartbeat --watch`) or under a user process supervisor. Activity checkpoints are based on tool and prompt activity, not transcript byte size or an estimated context-token count. `SessionEnd` records substantial sessions that did not sync so the next session can reconcile them. The protected `agent-log` writer counts as a sync and supplies the timestamp, session label, and reciprocal trace metadata.

The shared spawn guard checks named agents in the global memory tree and in the selected project memory directory against the wake contract in `AGENTS.md`. Spawn prompts must list each required file using its actual agent-body path; when that agent has `WAKE.md`, every file path it names is required too. Ordinary unnamed harness subagents pass through without this body-specific check.

### 5. Write through the writer

`memory.md`, `learnings.md`, and `patterns.md` are protected. Never edit them directly. Every write goes through `agent-log`:

```bash
agent-log --file ~/.agent-memory/agents/my-agent/brain/memory.md \
  --content "what happened, and what's next" \
  --trace "none (new topic)" \
  --agent my-agent --cli claude --session-id <real-session-id> --project <project>
```

## What to configure

- **Agent identity** — `soul.md`, `heart.md`, `work.md`, plus the `core/` and `mind/` files. This is the slow-changing self that stays stable across sessions.
- **Read limits** — the wake slices in `AGENTS.md` (soul top 30 lines, memory top 80, and so on). Tune these to your context budget; they trade recall for cost.
- **Agent body locations** — shared bodies live under `~/.agent-memory/agents/<name>/`; project-specific bodies live under `agents/<name>/` in the project's selected memory directory. Project-specific bodies override shared bodies with the same name for that project.
- **Protocols** — `examples/protocols/` contains optional examples. Adapt lifecycle triggers and file paths to your harness and memory setup before using them.

## Why files, not a database

Plain Markdown is readable by humans, by every agent runtime, and by version control. A file with a clear structure is easier to trust than a retrieval index nobody can explain. If the memory is wrong, you can open the file and fix it.

## License

MIT. See `LICENSE`.
