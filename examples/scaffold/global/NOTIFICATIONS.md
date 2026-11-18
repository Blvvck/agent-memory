# Notifications

Record requests that need another person's or agent's attention. A request names the owner, the action, the reason it matters, and any context they need to act without reconstructing the work.

## How to write this file

Write a request when someone else has to act and the work will stall without them. Put the work that raised the request in the scope's `ACTIVITY.md`; this file holds the request, not the work log. Mark a request resolved when it is handled, or leave the resolution trace in the entry.

Use the entry format and protected writer configured in the root `AGENTS.md`.

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace.

Example request:

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: @Owner: the action needed, why it matters, and the context
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

Entries start here.

## Request shape

An effective request answers four questions in the first two sentences:

- **Who:** the person or agent who must act.
- **What:** the smallest action that unblocks the work.
- **Why now:** the consequence of waiting.
- **Where:** the file, decision, or link they need.

If the request is resolved in the same session, record the resolution in the entry instead of leaving the request open.
