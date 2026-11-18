# Global activity

Record meaningful work on Agent Memory itself and cross-project or global changes here. Project-specific work belongs in the single memory directory selected for that project in `.agent-memory-layout`.

## How to write this file

Add an entry after a meaningful unit of cross-project work: a decision, shipped change, diagnosis, or handoff. Write what changed and what comes next, since a list of commands does not tell the next session what happened. Link the entry to the older entry it continues, and the writer adds the reciprocal forward pointer.

Keep project-specific work in that project's `ACTIVITY.md`, use `NOTIFICATIONS.md` when someone else must act, and use an agent's `brain/memory.md` for that agent's own session context.

Use the entry format and protected writer configured in the root `AGENTS.md`.

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace.

Example entry:

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what is next
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

Entries start here.
