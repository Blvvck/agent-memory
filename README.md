# agent-memory

A scaffold for giving an AI agent a persistent memory and a body, so its next session starts where the last one ended instead of blank.

## What's in the box

| Piece | What it is | When you touch it |
|-------|-----------|-------------------|
| `AGENTS.md` | The single entry point every harness loads | Once, at setup |
| `.agents/example/` | A full agent body template (identity + memory) | Copy it per agent, then edit |
| `agent-log` | The validated writer for memory files | Every time an agent writes a trace |
| `hooks/core/` | Shared dispatch for protected writes, spawn requirements, and trace enforcement | Invoked by harness adapters |
| `hooks/harnesses/` | Harness-specific adapters grouped by runtime | Once, when you wire your harness |
| `protocols/` | Operating playbooks (bootstrap, new-agent, review, handoff, team) | When the agent needs a procedure |
| `settings.example.json` | The hook wiring for Claude Code | Once, when you configure hooks |

## The loop

An agent works in a loop:

1. **Wake** — read its body (identity first, then recent memory) in slices.
2. **Work** — do the task, and write a short trace after each meaningful step.
3. **Sleep** — final sync, and link entries both ways with traces.

The agent improves because its next session reads what its last session wrote.

## Runtime

The runtime is TypeScript compiled to JavaScript and requires Node.js 18 or later. The published npm package includes the compiled runtime, so users do not need Python or a TypeScript compiler.

## Setup

### 1. Install

Copy the repo to `~/.agent-memory/`, install the build dependencies, and compile the runtime:

```bash
cp -r agent-memory ~/.agent-memory
cd ~/.agent-memory && npm install && npm run build
```

### 2. Point your harness at the entry point

Symlink `AGENTS.md` to your harness's instruction file. Exactly one real file; every other harness entry is a symlink to it.

```bash
ln -s ~/.agent-memory/AGENTS.md ~/.claude/CLAUDE.md   # Claude Code
# ln -s ~/.agent-memory/AGENTS.md ~/.codex/AGENTS.md  # Codex, and so on
```

### 3. Create an agent

Copy the example body, then edit the files to define who this agent is:

```bash
cp -r ~/.agent-memory/.agents/example ~/.agent-memory/agents/my-agent
```

Fill in `soul.md` (identity), `heart.md` (who it works with), and `work.md` (its role). The `brain/` files start nearly empty and grow as the agent writes.

### 4. Wire the hooks

`settings.example.json` shows the Claude Code wiring. Harness adapters live under `hooks/harnesses/<harness>/` and translate that runtime's hook events to shared memory checks in `hooks/core/`. Hooks that depend on a harness-specific transcript format stay with that harness. The example invokes the compiled JavaScript under `dist/`; adjust the install path if needed.

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
- **The base directory** — the writer and hooks expect bodies under `~/.agent-memory/agents/<name>/`. If you install elsewhere, change the base path in `src/protected-log.ts` and the hook scripts to match.
- **The team layer** — the `sprint`, `standup`, and `leaderboard` protocols are optional. Turn them on only when several agents need to coordinate with each other. A single agent with memory doesn't need them.

## Why files, not a database

Plain Markdown is readable by humans, by every agent runtime, and by version control. A file with a clear structure is easier to trust than a retrieval index nobody can explain. If the memory is wrong, you can open the file and fix it.

## License

MIT. See `LICENSE`.
