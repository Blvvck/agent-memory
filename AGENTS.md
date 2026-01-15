# Agent Memory

This repository is a scaffold for giving an AI agent a persistent memory and a body: a set of Markdown files it reads when it wakes and writes as it works. The point is continuity — the agent's next session starts where the last one ended, instead of blank.

This file is the single entry point. Every harness should load it, either directly (Claude Code, and any harness that reads `AGENTS.md`) or through a symlink from that harness's own instruction file (`CLAUDE.md`, and the equivalent for Codex, OpenCode, and Antigravity). One real file; everything else a symlink to it.

## The loop

Memory works as a loop:

1. **Wake** — read the body and the newest slice of memory.
2. **Work** — do the task, and write a short trace as you go.
3. **Sleep** — final sync, and add the traces that link entries both ways.

The agent improves because its next session reads what its last session wrote.

## Waking: what to read, in order

Read these files first, in this order, and only in slices. Full reads of growing logs cost too much context, so read the newest part and trust the structure to surface what matters.

| File | Read | Why |
|------|------|-----|
| `soul.md` | top 30 lines | who the agent is |
| `brain/worldview.md` | top 20 lines | what it believes |
| `heart.md` | top 20 lines | who it works with |
| `brain/memory.md` | top 80 lines | what it did, newest first |
| `brain/learnings.md` | top 50 lines | recent mistakes to avoid |
| `brain/patterns.md` | top 50 lines | recent methods that worked |

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

`memory.md`, `learnings.md`, and `patterns.md` are protected. Do not edit them directly. Every write goes through `agent-log`, which validates the entry, takes a lock, and replaces the file atomically. A direct edit is blocked.

```bash
agent-log --file .agents/example/brain/memory.md \
  --content "what happened, and what's next" \
  --trace "none (new topic)" \
  --agent Example --cli claude --session-id <real-session-id> --project <project>
```

## What "recursive self-improvement" means here

The loop improves the agent's context and behavior, not its model weights. The model is fixed; what changes is the memory the next session reads. That is the recursion.
