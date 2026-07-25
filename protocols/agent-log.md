# Agent Log

Use `agent-log` for every write to a protected memory file. Protected files include agent `memory.md`, `learnings.md`, and `patterns.md`, plus global or project `ACTIVITY.md` and global `NOTIFICATIONS.md`.

## Choose the file

| File | Record |
|---|---|
| `brain/memory.md` | Meaningful work, decisions, verified findings, outcomes, and the next step |
| `brain/learnings.md` | Reusable lessons, including corrections that prevent a repeat mistake |
| `brain/patterns.md` | A method that worked and when to use it |
| `ACTIVITY.md` | Work completed in the global or current project scope |
| `NOTIFICATIONS.md` | A request or blocker that needs another person or agent to act |

Do not log routine tool use. Capture decisions, discoveries, verified results, blockers, and unresolved state that will help later.

## Entry format

Use the exact format required by the installed writer:

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:harness:ID]: Summary
```

Use `universal` for global or cross-project agent memory. Project activity files use their project scope. Include the real CLI and session ID; never invent a placeholder. Put newest entries first in chronological logs.

## Write through the CLI

Provide the file, concise content, trace target, agent name, CLI, session ID, and project:

```bash
agent-log --file ~/.agent-memory/agents/my-agent/brain/memory.md \
  --content "Recorded the verified outcome and next step." \
  --trace "none (new topic)" \
  --agent my-agent --cli codex --session-id <real-session-id> --project <project>
```

For a related entry, use its complete existing header as `--trace`; the writer resolves it and adds the reciprocal forward trace. Use `none (new topic)` only when no existing entry relates to this one. If the writer rejects an entry or target, fix the input and retry through `agent-log`; do not edit the protected file directly.

Write project activity to `ACTIVITY.md` in the project's selected memory directory, as recorded in `.agent-memory-layout`. Write global activity to `~/.agent-memory/ACTIVITY.md`. These logs serve different scopes.
