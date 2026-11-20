# Agent Log

Use `agent-log` for every write to a protected memory file. Protected files include agent `memory.md`, `learnings.md`, and `patterns.md`, plus global or project `ACTIVITY.md` and global `NOTIFICATIONS.md`.

## Work Log section

Every protected log has a `## Work Log` section near the top. New entries go there, newest first. Authored history, lessons, and reference material below that section stay in place; they are part of the agent's identity. The writer inserts at the Work Log section rather than at the top of the file.

`memory.md`, `learnings.md`, and `patterns.md` use the same entry format and the same reciprocal traces. The only difference is what the file records.

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

## Correct or remove an entry

Append a correction when a mistake matters to a later reader: add a new entry and pass the mistaken entry's header as `--trace`, so both directions stay linked.

Three modes change an existing entry, and only its author may run them:

| Mode | Changes | Keeps |
|---|---|---|
| `--edit --header HEADER --content TEXT` | the prose | subject, metadata, trace lines |
| `--rewrite --header HEADER --content TEXT` | subject and prose | metadata, trace lines; every reference to the old header is rewritten |
| `--delete --header HEADER` | removes the entry | allowed only when the entry has no trace links |

`--delete` refuses an entry that traces to an older entry, an entry that a later entry traces to, or an entry that another entry references. Removing a linked entry would leave a dangling trace or erase the reason another entry points at it. In that case add a new entry that records the correction and pass the original header as `--trace`, so the correction is visible and the original stays traceable.

Pass `--header` the entry's exact header line, or `--header-file` when the line contains shell characters. When a subject changes, `--rewrite` updates every `trace` and `trace-forward` line that quotes the old header in the same atomic write.

Write project activity to `ACTIVITY.md` in the project's selected memory directory, as recorded in `.agent-memory-layout`. Write global activity to `~/.agent-memory/ACTIVITY.md`. These logs serve different scopes.
