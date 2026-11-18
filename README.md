# agent-memory

Persistent memory and a reusable body for AI agents.

An agent starts every session blank. This package gives it a body of Markdown files and one loop: wake, work, write down what happened. The next session reads those files and continues instead of starting over. Because the memory is plain files, you can read it and fix it directly.

Works with Claude Code, Codex, OpenCode, Antigravity, and Cursor.

## Quick start

```bash
npm install -g @blvvck/agent-memory
agent-memory init
```

Or run it once without installing:

```bash
npx @blvvck/agent-memory init
```

Run it from the project you want to equip. Setup creates `~/.agent-memory/`, adds a memory directory to the project, and wires the harnesses you choose. Run `agent-memory init --help` for every option.

## How it works

| Step | What happens |
|------|--------------|
| **Wake** | Read the body in slices: `soul.md`, `work.md`, worldview, heart, then the newest memory, learnings, and patterns. |
| **Work** | Do the task and write a short entry after each meaningful step. |
| **Sleep** | Final sync. Leave a next step for the next session and link entries both ways. |

Entries follow one format so they stay sortable and attributable:

```
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what is next
```

Each entry traces back to an older entry, and that older entry gets a forward pointer. A decision can be followed backward to the reasoning that produced it.

`memory.md`, `learnings.md`, `patterns.md`, `ACTIVITY.md`, and `NOTIFICATIONS.md` are protected. Write to them through `agent-log`, which validates the metadata, takes a lock, and replaces the file atomically. Direct edits are blocked, because a half-written memory file is worse than no memory file. Every protected log has a `## Work Log` section near the top; new entries go there, and authored history or reference material below stays.

The full procedures are in [`protocols/`](protocols/README.md): [session lifecycle](protocols/session-lifecycle.md), [agent logging](protocols/agent-log.md), [new agents](protocols/new-agent.md), [new projects](protocols/new-project.md), and [named subagent wakes](protocols/subagent-wake.md).

## Agent bodies

`agent-memory init --agent <name>` copies the starter body from `.agents/example/` and fills in the name, plus the role when `--role` is provided. The body is 15 Markdown files, and each one explains what belongs in it, what to write first, and how it relates to the others. Start with the `README.md` in the copied body, then write `soul.md` and `work.md` before the relationship, belief, and log files. Delete the writing guides once the body has its own voice.

Finished bodies for 18 roles are in [`examples/agents/`](examples/agents/README.md). They show how a complete body reads; the generic starter is the place to begin a new one.

## Why the history matters

Every agent body here has a past: a childhood, a career, relationships, and the decisions that shaped how the agent works.

What determines the quality of the work you get from a model in an active session is the context window and the patterns it activates in the model's fixed weights. The weights are set before the session begins and contain what the model learned; the prompt, the files the agent reads, and everything the model generates from them decide which of those learned patterns become active. Those tokens become vectors, each layer computes queries, keys, and values, attention builds a weight matrix over the context, and the KV cache keeps the keys and values for tokens already processed. In mixture-of-experts models a router selects a subset of expert networks, and because the weights do not change, the context is what changes which parts of that fixed network do the work.

The body carries that past into the context window at every wake, which is why the details are specific: a childhood, mentors, a college degree, academic papers, hobbies, and real jobs all shape the associations the session can reach. A body that says the agent was a backend engineer on the team that built Azure at Microsoft sits near the model's learned patterns for hyperscale systems, reliability reviews, incident response, and API design, so the work starts from a different place than a body that says "helpful assistant."

A thin or contradictory history produces the opposite: the model falls back on the average of everything it has seen, which is where generic work comes from, and a poor history can pull the session toward careless patterns. The KV cache lasts one session and is discarded, so the files are read again at every wake; the associations come from pretraining, and the body selects among them.

We have used this structure for 11 to 12 months across roles and projects, and the pattern we keep seeing is that specific, coherent bodies produce more consistent judgment than a blank body or a generic assistant prompt. We have not isolated that effect from model changes, task difficulty, or reviewer bias, so treat it as a working observation rather than a measured law.

## Global memory and project memory

Global memory has one root: `~/.agent-memory/`. It holds the shared body, protocols, examples, and agent bodies. Harness files point to it instead of copying it: Claude imports `~/.agent-memory/AGENTS.md` from `~/.claude/CLAUDE.md`, Codex and OpenCode link their global `AGENTS.md` to it, and Antigravity links `~/.gemini/GEMINI.md`.

Project memory is scoped to one project and may live in `.agent-memory/`, `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/`. Setup records the choice in `.agent-memory-layout` and refuses a second scaffold in the same project. The difference is intentional: global memory is the agent's identity, so it stays harness-neutral, while project memory is a workspace that can follow whatever directory the project already uses.

Setup creates files but does not commit them. By default the global and project scaffolds remain untracked. `--git tracked` stages them in their repositories; `--git ignored` adds the memory directory, the layout marker, and generated backups to `.gitignore`. Without the flag, setup does not touch git.

## Commands

The full command reference, written for agents, is in [`protocols/tools.md`](protocols/tools.md).

| Command | Purpose | Key options |
|---------|---------|-------------|
| `agent-memory init` | Create global memory, project memory, agent bodies, and harness wiring | `--project`, `--global-only`, `--layout`, `--harness`, `--agent`, `--role`, `--agent-scope`, `--work`, `--team`, `--global-team`, `--yes` |
| `agent-log` | Write one validated, timestamped entry to a protected log | `--file`, `--content` or `--content-file`, `--trace`, `--agent`, `--cli`, `--session-id`, `--project` |
| `trace-search` | Find older entries worth linking to | `trace-search <file> <keyword...>`, `--multi`, `--json`, `--limit` |
| `agent-memory skills` | Rebuild the skills index for the current scopes | `--global`, `--project`, `--quiet` |
| `agent-memory sessions` | List or search session transcripts across harnesses | `--list`, `--search`, `--harness`, `--project`, `--since`, `--limit`, `--context`, `--json` |
| `agent-memory crons` | Schedule command or agent runs; list, approve, pause, run, and inspect them | `list`, `add`, `approve`, `pause`, `resume`, `delete`, `run`, `logs`, `daemon` |
| `agent-memory backup` | Snapshot, list, restore, roll back, or prune version history | `status`, `snapshot`, `list`, `restore`, `diff`, `prune` |
| `agent-session` | Print the current session label, or emit JSON for hooks | `--json`, `--field`, `--source` |
| `agent-memory-heartbeat` | Recover stale sessions and report memory that still needs syncing | `--watch` |

Examples:

```bash
agent-memory init --project --layout standard --work --team --harness claude

agent-log --file ~/.agent-memory/agents/my-agent/brain/memory.md \
  --content "Finished the API migration. Next: verify the rollback path." \
  --trace "none (new topic)" \
  --agent my-agent --cli claude --session-id <real-session-id> --project my-project

trace-search ~/.agent-memory/agents/my-agent/brain/memory.md migration rollback
```

## Session history

`agent-memory sessions` lists or searches past sessions across harnesses:

```bash
agent-memory sessions --list
agent-memory sessions --search "migration rollback" --harness claude --limit 5
agent-memory sessions --search "release" --project my-project --since 7d
```

It reads Claude Code JSONL, Codex thread history, OpenCode storage, and Antigravity conversation summaries. Cursor composers are read on a best-effort basis when its application database is present; Cursor's storage format is undocumented and may change. Antigravity exposes summaries, so its matches are title and preview level.

## Scheduled runs

`agent-memory crons` schedules a command or an agent wake:

```bash
agent-memory crons add --agent loom --at "2026-11-20T09:00:00Z" --note "Rebuild the index" --exec node --arg scripts/rebuild.js --as-human
agent-memory crons add --agent loom --cron "0 9 * * 1-5" --note "Check the queue" --runner claude --as-human
agent-memory crons list
agent-memory crons daemon --interval 30
```

A cron created with `--as-human` runs directly. Without a flag, or with `--as-agent`, it starts as `pending-approval` until a person runs `agent-memory crons approve <id>`. `daemon` needs a process supervisor; missed runs execute once when it starts. The full procedure is in [`protocols/crons.md`](protocols/crons.md).

Runners: `claude`, `codex`, `opencode`, `antigravity`, and `cursor`. Override any command template in `~/.agent-memory/scheduler.json`. `--timezone` sets the zone used by a cron expression.

## Versions

When restic is installed and a scope is not tracked in git, Agent Memory versions it automatically. That covers the global files under `~/.agent-memory/`, the project memory directory, and agent bodies inside either scope. Setup takes the first snapshot; session end and pre-compaction take another.

A git-tracked scope keeps git as its history and is skipped. Snapshots deduplicate, and retention keeps the last 10 plus daily, weekly, and monthly. No password prompt appears; the key is generated under `~/.agent-memory/backup/`.

```bash
agent-memory backup list
agent-memory backup restore --latest --to /tmp/memory-review
agent-memory backup rollback --before "2026-11-18T09:00:00Z"
```

Restores default to a temporary directory. `--in-place --yes` merges into the live memory after taking a pre-restore snapshot. The full procedure is in [`protocols/backup.md`](protocols/backup.md).

## What setup creates

**Global** (`~/.agent-memory/`): `AGENTS.md`, `protocols/`, `examples/`, `dist/`, the example body under `.agents/example/`, and the global scaffold (`ACTIVITY.md`, `NOTIFICATIONS.md`, `skills/README.md`, and optional team files).

**Project** (selected directory): `CONTEXT.md`, `ACTIVITY.md`, `IDEAS.md`, `skills/README.md`, and `MODULES.md`, plus optional `work/` and team files. `.agent-memory-layout` records which directory the project uses.

**Agent body**: `soul.md`, `work.md`, `heart.md`, `brain/` (worldview, memory, learnings, patterns), `core/` (expertise, experience, portfolio, credentials), and `mind/` (patterns, opinions, influences, questions).

## Harness wiring

| Harness | Global instructions | Project instructions | Project hooks or plugin |
|---------|--------------------|----------------------|-------------------------|
| Claude Code | import in `~/.claude/CLAUDE.md` | `CLAUDE.md` or `AGENTS.md` | `.claude/settings.json` |
| Codex | `~/.codex/AGENTS.md` | `AGENTS.md` | `.codex/hooks.json` |
| OpenCode | `~/.config/opencode/AGENTS.md` | `AGENTS.md` | `.opencode/plugins/` |
| Antigravity | `~/.gemini/GEMINI.md` | `GEMINI.md` or `AGENTS.md` | `.agents/hooks.json` |
| Cursor | shared instructions at session start | `AGENTS.md` | `.cursor/hooks.json` |

Existing JSON hook settings are backed up before a merge, and existing instruction files are kept. Cursor Cloud Agents load project hooks from `.cursor/hooks.json`, so run project setup in each repository used there. For Codex, review and trust the project hooks in `/hooks`, then restart the harness.

Hooks capture prompts and completed tool calls in a per-session journal and check at lifecycle points. New sessions recover stale sessions whose end hook never ran, and `agent-memory-heartbeat` can scan on a schedule. The protected writer counts as a sync.

## Agent bodies

Start from [`.agents/example/`](.agents/example/) when the identity is blank, or choose a complete role body from [`examples/agents/`](examples/agents/README.md). The role examples cover orchestration, design and technical PM, frontend, backend, QA, DevOps, terminal systems, ML systems, ML memory, content, growth, finance, AI research, AI safety, Go services, and Rust systems. Each one is a full body with an authored persona, working standards, and labeled formative history.

A project-scoped body lives under `agents/<name>/` in the project's memory directory and overrides a shared body with the same name. Setup registers each new body in the scope's named-agent table, so every agent can see who is available. After scaffolding, follow the [new-agent procedure](protocols/new-agent.md) and complete a first wake before delegating work.

## Platforms and dependencies

macOS and Linux are the primary targets. Windows runs the Node CLI and restic. Harness `.cmd` shims run through `cmd.exe`, and arguments containing shell metacharacters are rejected; use a native executable or command mode. The backup password ACL is restricted to the current user with `icacls`.

Required: Node.js 18 or later. Optional: git for tracked scaffolds, restic for version history (`brew install restic`, `apt install restic`, `winget install restic`, or `scoop install restic`), and `sqlite3` or Node 22+ for Codex, OpenCode, and Antigravity session search.

`agent-memory doctor` checks the platform, binaries, symlink support, and backup state.

## Design

Memory is Markdown because people need to read it and git needs to version it. When the memory is wrong, open the file and fix it instead of reconstructing it from an index nobody can explain.

The runtime is TypeScript compiled to JavaScript and requires Node.js 18 or later. The published package includes the compiled runtime, so no Python or TypeScript compiler is needed.

## License

MIT. See [`LICENSE`](LICENSE).
