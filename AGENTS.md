# Agent Memory

This repository is a scaffold for giving an AI agent a persistent memory and a body: a set of Markdown files it reads when it wakes and writes as it works. The point is continuity — the agent's next session starts where the last one ended, instead of blank.

This file is the single entry point. Every harness should load it, either directly (Claude Code, and any harness that reads `AGENTS.md`) or through a symlink from that harness's own instruction file (`CLAUDE.md`, and the equivalent for Codex, OpenCode, and Antigravity). One real file; everything else a symlink to it.

## The loop

Memory works as a loop:

1. **Wake** — read the body and the newest slice of memory.
2. **Work** — do the task, and write a short trace as you go.
3. **Sleep** — final sync, and add the traces that link entries both ways.

The agent improves because its next session reads what its last session wrote.

## Working rules

These are the obligations that make continuity work. The rest of this file explains how to meet them.

- **Continue the next step.** If memory names a next action, do it before starting unrelated work.
- **Log as you work.** After a meaningful decision, discovery, completed unit, or blocker, write an entry. Hooks are reminders; they do not replace the obligation. Record a blocker in `NOTIFICATIONS.md` when someone else must act, and record a mistake in `learnings.md` with its cause.
- **Log where the work belongs.** The project tag names the project the work belongs to. A session in one directory can still produce work for another project.
- **Capture before compaction.** Record the objective, decisions, completed work, remaining steps, and paths before context is compacted.
- **Close the session.** Record the verified outcome, the next action, and unresolved blockers, and hand off work that is ready.
- **Check before irreversible actions.** For a delete, overwrite, or command with side effects, verify the target and what will change. If it is unclear, ask.
- **Use real metadata.** Timestamp, agent, CLI, and session ID come from the session. Never invent a placeholder.
- **Write through `agent-log`.** A protected file is never edited directly.

## Required protocols

`agent-memory init` installs the required procedures in `~/.agent-memory/protocols/`. Read the matching procedure before the task:

| Task | Required procedure |
|---|---|
| Create or update an agent body | `~/.agent-memory/protocols/new-agent.md` |
| Set up a project or connect a harness | `~/.agent-memory/protocols/new-project.md` |
| Start, sync, compact, or end a session | `~/.agent-memory/protocols/session-lifecycle.md` |
| Delegate to a named agent body | `~/.agent-memory/protocols/subagent-wake.md` |
| Write memory, activity, or notifications | `~/.agent-memory/protocols/agent-log.md` |
| Add or update a skill | `~/.agent-memory/protocols/skills.md` |
| Schedule a command or agent wake | `~/.agent-memory/protocols/crons.md` |
| Look up a command or option | `~/.agent-memory/protocols/tools.md` |
| Restore or inspect versions | `~/.agent-memory/protocols/backup.md` |

These protocols are part of the working system. `examples/` contains optional additions and does not replace them.

## Named agents

Every named agent available in this scope is listed here. `agent-memory init --agent <name>` adds or updates the row automatically. Keep the table current when a body is renamed, removed, or repurposed.

Project-scoped agents are listed in `agents/README.md` inside the project's memory directory.

Where the harness supports the wake hook, a message that starts with `Hey <name>`, `Hi <name>`, `Yo <name>`, `@<name>`, or `<name>,` wakes that body. An explicit `@<name>` works anywhere in a message, and phrases such as `ask <name> to review this` or `wake <name>` do the same. A bare name in the middle of a sentence does not trigger a wake. In other harnesses, delegate through the harness's subagent support and pass the body paths in `protocols/subagent-wake.md`.

<!-- agent-memory:agents:start -->
| Agent | Role | Scope | Body |
|-------|------|-------|------|
<!-- agent-memory:agents:end -->

## Skills

Skills are reusable procedures written as Markdown. Shared skills live in `~/.agent-memory/skills/`; project skills live in `skills/` inside the project's memory directory. Each skill is `<name>.md` or `<name>/SKILL.md`, with optional `name` and `description` frontmatter.

Each scope keeps its catalog in `skills/README.md`. Run `agent-memory skills` after adding, renaming, or removing a skill; setup also rebuilds it. Read the catalog before specialized work and open only the skill you need.

To reuse an existing harness skill directory, link it into `~/.agent-memory/skills/` once.

## Installed modules

Work planning and team files are opt-in. This table lists what is present in the current scope. Run `agent-memory init --project --work --team` to add a project module, or `agent-memory init --global-team` for the shared team files; setup adds missing files and leaves existing ones alone.

<!-- agent-memory:modules:start -->
| Module | Files | Procedure |
|--------|-------|-----------|
<!-- agent-memory:modules:end -->

## Optional workflow examples

Read these only when the project has chosen the workflow. They are optional additions that the project adapts.

| Task | Optional example |
|---|---|
| Reproduce and review a code change | [Bug fix and review](examples/protocols/bug-fix-and-review.md) |
| Plan a feature or structured project work | [Project planning](examples/protocols/project-planning.md) |
| Run a sprint | [Sprint lifecycle](examples/protocols/sprint-lifecycle.md) |
| Summarize team progress | [Standup](examples/protocols/standup.md) |
| Agree who maintains shared planning and team files | [File updates](examples/protocols/file-updates.md) |
| Coordinate work and hand off to another agent | [Team coordination](examples/protocols/team-coordination.md); use the required [named subagent wake protocol](protocols/subagent-wake.md) when delegating to a named agent body |

See the [optional protocol index](examples/protocols/README.md) for all examples. They are included with the Agent Memory package but are not copied into a project or enabled by setup.

## Waking: what to read, in order

Read these files first, in this order, and only in slices. Full reads of growing logs cost too much context, so read the newest part and trust the structure to surface what matters.

| File | Read | Why |
|------|------|-----|
| `soul.md` | top 30 lines | who the agent is |
| `work.md` | top 30 lines | its role and craft |
| `brain/worldview.md` | top 20 lines | what it believes |
| `heart.md` | top 20 lines | who it works with |
| `brain/memory.md` | top 80 lines | what it did, newest first |
| `brain/learnings.md` | top 50 lines | recent mistakes to avoid |
| `brain/patterns.md` | top 50 lines | recent methods that worked |

Named subagents with a body receive this same wake contract. Bodies may be shared under `~/.agent-memory/agents/<name>/` or scoped to a project under `agents/<name>/` inside its selected memory directory; a project body overrides a shared body with the same name. Spawn instructions must name every file above by that body's actual path. If it has `WAKE.md`, include that file and every file path it lists. The hook enforces this contract only when the spawn resolves to a registered named body; ordinary harness subagents pass through.

At wake, check `~/.agent-memory/NOTIFICATIONS.md` when it exists. For project work, read `CONTEXT.md` and recent `ACTIVITY.md` from the selected project memory directory. The portable directory is `.agent-memory/`; harness layouts can use `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/`. For global or cross-project work, read the newest entries in `~/.agent-memory/ACTIVITY.md` when present. Include relevant project context and activity paths in subagent instructions when the delegated task depends on them. If the agent's memory is empty or stale, reconstruct what happened from the scope's activity log, then resume logging from the current session.

## Syncing: write as you work

Do not wait until the end. After each meaningful unit of work, write a short entry. Meaningful work includes a decision, diagnosis, verified finding, research result, configuration change, code or test result, shipped work, blocker, or useful discovery.

`memory.md` records what happened, `learnings.md` a reusable mistake, `patterns.md` a reusable method, and `worldview.md` a change in belief. Substantive work that produces no code still belongs in the scope's `ACTIVITY.md` and the agent's memory. Trivial reads and exploratory commands do not need entries. Verified, shipped work may also belong in `core/portfolio.md`, which stays selective rather than becoming a second activity log.

## Where new entries start

Every protected log has a `## Work Log` section near the top. Add new entries there, newest first. The authored history or reference material below the section stays; it is part of the agent's identity. The writer inserts new entries at that section, not at the top of the file.

`memory.md`, `learnings.md`, and `patterns.md` use the same entry format and the same bidirectional traces. Activity and notification logs use it as well.

## Every entry follows one format

```
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what's next
```

- The UTC timestamp orders events across machines.
- The project tag keeps one codebase's work out of another.
- The agent and session IDs make every claim traceable.
- Entries missing any of these are rejected.

## Traces run both ways

Each entry points back to the older entry it relates to, and the older entry gets a forward pointer. This applies to every protected log, including learnings and patterns. That turns a pile of logs into a graph you can walk. When someone asks why a decision was made, start at the decision and follow the trace.

```
- ↪ trace: relates-to [2026-08-05T14:32:00Z] [project] @Agent [session:cli:ID]: The older entry
```

## Protected logs: write through one door

`memory.md`, `learnings.md`, `patterns.md`, `ACTIVITY.md`, and `NOTIFICATIONS.md` are protected. Do not edit them directly. Every write goes through `agent-log`, which validates the entry, takes a lock, replaces the file atomically, and inserts at the file's `## Work Log` section.

```bash
agent-log --file .agents/example/brain/memory.md \
  --content "what happened, and what's next" \
  --trace "none (new topic)" \
  --agent Example --cli claude --session-id <real-session-id> --project <project>
```

## Global memory and project memory

Global memory lives in one place: `~/.agent-memory/`. It holds the shared body — `AGENTS.md`, protocols, examples, and agent bodies — and harness files point to it rather than keeping a second copy. Claude imports it from `~/.claude/CLAUDE.md`, Codex and OpenCode link their global `AGENTS.md` files to it, and Antigravity links `~/.gemini/GEMINI.md`. Every hook reads the same root.

Project memory is selected per project and may live in `.agent-memory/`, `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/`. The choice is recorded in `.agent-memory-layout`, and a project keeps exactly one scaffold.

This difference is intentional. Global memory is the agent's identity, so it cannot live inside one harness's directory without making that harness primary or duplicating the body. Project memory is a workspace and follows the directory the project already uses. A project usually has one primary harness, while a person usually runs several.

By default setup leaves files untracked. `--git tracked` stages the global and project scaffolds without committing. `--git ignored` adds the memory directory, the layout marker, and generated backups to `.gitignore`. Without the flag, the tool does not touch git.

## Project and global work logs

When a project has a selected memory directory (`.agent-memory/`, `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/`), read its `CONTEXT.md` before changing project files and record meaningful project work in that directory's `ACTIVITY.md`. Record cross-project or global system work in `~/.agent-memory/ACTIVITY.md`. These files are distinct from an agent's `brain/memory.md`: the activity log records work in a scope, while brain memory preserves context for that agent across sessions.

Use the selected project memory directory's `IDEAS.md` for useful project ideas outside the current task. Use `~/.agent-memory/NOTIFICATIONS.md` when a person or agent needs to respond or take action. The sprint, backlog, feature, project lounge, and leaderboard files are optional; use them only when the project opts into those workflows, and read them when relevant to the task. A project `COMMANDS.md` is not required; inspect the repository's own documentation and manifests for commands.

## Session history

When memory does not hold the detail, search past sessions instead of guessing:

```bash
agent-memory sessions --search "keyword" --harness claude --limit 5
```

It reads the local session stores for Claude Code, Codex, OpenCode, Antigravity, and Cursor where present. Antigravity returns summary-level matches. Record a finding in memory when it changes the work.

## Scheduled runs

Use `agent-memory crons` when work should happen later without a person starting a session.

An agent schedules on its own initiative with `--as-agent`. Crons are `pending-approval` by default, and a person must approve one before it fires. Pending crons are surfaced at session start and in `agent-memory crons list`. A person creating a cron for themselves passes `--as-human` to activate it immediately. An agent must always pass `--as-agent`.

```bash
agent-memory crons add --agent <your-name> --cron "0 9 * * 1" \
  --timezone Europe/London \
  --note "Review last week's failures and write the summary." \
  --runner claude --as-agent

agent-memory crons list
agent-memory crons pause <id>
agent-memory crons resume <id>
agent-memory crons delete <id>
```

Schedules are one-shot `--at <ISO>` or five-field `--cron`, evaluated in `--timezone`. Targets are a harness runner or a command. The note becomes the task at wake; normal wake memory is unchanged.

Run `agent-memory crons daemon` under a process supervisor for unattended execution. Runs missed while the machine was asleep execute once when the daemon starts. Every run is recorded in `~/.agent-memory/crons/runs.jsonl`. The full procedure is `protocols/crons.md`.

## Versions and restores

When a scope is not tracked in git, Agent Memory snapshots it automatically. That covers the global files under `~/.agent-memory/`, the project memory directory, and agent bodies inside either scope. Snapshots happen at setup, at session end, and before compaction. A git-tracked scope keeps git as its history and is skipped.

The password is generated and stored under `~/.agent-memory/backup`; never print, commit, or delete it. Use `agent-memory backup list` to see versions. Restore to a temporary directory with `agent-memory backup restore <id> --to <path>` or `--latest`, inspect it, and ask a person before using `--in-place`. `backup rollback --before <ISO>` and `backup fast-forward` are aliases for the same restore operation.

## What "recursive self-improvement" means here

The loop improves the agent's context and behavior. The model weights stay fixed; what changes is the memory the next session reads. That is the recursion.
