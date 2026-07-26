# Agent Memory

This repository is a scaffold for giving an AI agent a persistent memory and a body: a set of Markdown files it reads when it wakes and writes as it works. The point is continuity — the agent's next session starts where the last one ended, instead of blank.

This file is the single entry point. Every harness should load it, either directly (Claude Code, and any harness that reads `AGENTS.md`) or through a symlink from that harness's own instruction file (`CLAUDE.md`, and the equivalent for Codex, OpenCode, and Antigravity). One real file; everything else a symlink to it.

## The loop

Memory works as a loop:

1. **Wake** — read the body and the newest slice of memory.
2. **Work** — do the task, and write a short trace as you go.
3. **Sleep** — final sync, and add the traces that link entries both ways.

The agent improves because its next session reads what its last session wrote.

## Required protocols

`agent-memory init` installs the required procedures in `~/.agent-memory/protocols/`. Read the matching procedure before the task:

| Task | Required procedure |
|---|---|
| Create or update an agent body | `~/.agent-memory/protocols/new-agent.md` |
| Set up a project or connect a harness | `~/.agent-memory/protocols/new-project.md` |
| Start, sync, compact, or end a session | `~/.agent-memory/protocols/session-lifecycle.md` |
| Delegate to a named agent body | `~/.agent-memory/protocols/subagent-wake.md` |
| Write memory, activity, or notifications | `~/.agent-memory/protocols/agent-log.md` |

These protocols are part of the working system. `examples/` contains optional additions and does not replace them.

## Optional workflow examples

Read these only when the project has chosen the workflow. The examples are references to adapt, not required Agent Memory behavior.

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

At wake, check `~/.agent-memory/NOTIFICATIONS.md` when it exists. For project work, read `CONTEXT.md` and recent `ACTIVITY.md` from the selected project memory directory. The portable directory is `.agent-memory/`; harness layouts can use `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/`. For global or cross-project work, read the newest entries in `~/.agent-memory/ACTIVITY.md` when present. Include relevant project context and activity paths in subagent instructions when the delegated task depends on them.

## Syncing: write as you work

Do not wait until the end. After each meaningful unit of work — a decision, a fix, a finding — write a short trace to the right file. `memory.md` for what happened, `learnings.md` for a reusable mistake, `patterns.md` for a reusable method.

## Every entry follows one format

```
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what's next
```

- The UTC timestamp orders events across machines.
- The project tag keeps one codebase's work out of another.
- The agent and session IDs make every claim traceable.
- Entries missing any of these are rejected.

## Traces run both ways

Each entry points back to the older entry it relates to, and the older entry gets a forward pointer. That turns a pile of logs into a graph you can walk. When someone asks why a decision was made, start at the decision and follow the trace.

```
- ↪ trace: relates-to [2026-08-05T14:32:00Z] [project] @Agent [session:cli:ID]: The older entry
```

## Protected logs: write through one door

`memory.md`, `learnings.md`, `patterns.md`, `ACTIVITY.md`, and `NOTIFICATIONS.md` are protected. Do not edit them directly. Every write goes through `agent-log`, which validates the entry, takes a lock, and replaces the file atomically. A direct edit is blocked.

```bash
agent-log --file .agents/example/brain/memory.md \
  --content "what happened, and what's next" \
  --trace "none (new topic)" \
  --agent Example --cli claude --session-id <real-session-id> --project <project>
```

## Global memory and project memory

Global memory lives in one place: `~/.agent-memory/`. It holds the shared body — `AGENTS.md`, protocols, examples, and agent bodies — and harness files point to it rather than keeping a second copy. Claude imports it from `~/.claude/CLAUDE.md`, Codex and OpenCode link their global `AGENTS.md` files to it, and Antigravity links `~/.gemini/GEMINI.md`. Every hook reads the same root.

Project memory is selected per project and may live in `.agent-memory/`, `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/`. The choice is recorded in `.agent-memory-layout`, and a project keeps exactly one scaffold.

The asymmetry is deliberate. Global memory is the agent's identity and must be harness-neutral, so it cannot live inside one harness's directory without making that harness primary or duplicating the body. Project memory is a workspace, and it follows the directory the project and its harness already use. A project usually has one primary harness, while a person usually runs several, so a project workspace can be colocated with a harness without splitting the shared identity.

`agent-memory init` creates files but never stages, commits, or ignores them. Global files live outside the project repository. Project files, the layout marker, and harness entry files land untracked inside it. Commit them when the team should share the context, or ignore them when they are local runtime state; the tool does not choose for you.

## Project and global work logs

When a project has a selected memory directory (`.agent-memory/`, `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/`), read its `CONTEXT.md` before changing project files and record meaningful project work in that directory's `ACTIVITY.md`. Record cross-project or global system work in `~/.agent-memory/ACTIVITY.md`. These files are distinct from an agent's `brain/memory.md`: the activity log records work in a scope, while brain memory preserves context for that agent across sessions.

Use the selected project memory directory's `IDEAS.md` for useful project ideas outside the current task. Use `~/.agent-memory/NOTIFICATIONS.md` when a person or agent needs to respond or take action. The sprint, backlog, feature, project lounge, and leaderboard files are optional; use them only when the project opts into those workflows, and read them when relevant to the task. A project `COMMANDS.md` is not required; inspect the repository's own documentation and manifests for commands.

## What "recursive self-improvement" means here

The loop improves the agent's context and behavior, not its model weights. The model is fixed; what changes is the memory the next session reads. That is the recursion.
