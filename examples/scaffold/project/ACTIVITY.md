# Project activity

Record meaningful work completed in this project here. Work that belongs to another project stays in that project's memory directory.

## How to write this file

Add an entry after a meaningful unit of project work: a decision, shipped change, diagnosis, test result, or handoff. Write the result and the next action, not a transcript of the commands you ran. Link the entry to the older entry it continues, and the writer adds the reciprocal forward pointer.

Use `NOTIFICATIONS.md` when someone else must act, the project's `CONTEXT.md` for durable project instructions, and an agent's `brain/memory.md` for that agent's own session context.

Use the entry format and protected writer configured in the root `AGENTS.md`.

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace.

Example entry:

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what is next
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

Entries start here.
