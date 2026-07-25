# Optional Standup

Use this procedure when a team wants a regular status summary. It works with the files the project has chosen to maintain; a sprint plan, backlog, lounge, or leaderboard is not required.

## Gather the current state

1. Find the project's selected memory directory from `.agent-memory-layout`. Read its `ACTIVITY.md` and the relevant part of `CONTEXT.md`.
2. Read `~/.agent-memory/NOTIFICATIONS.md` if it exists, and identify requests or blockers related to this project.
3. If the project has opted into `work/SPRINT.md` or `work/BACKLOG.md`, read the relevant current items.
4. Use recent entries and current status fields as evidence. Do not infer that work is complete just because it was discussed.

## Report

Summarize only what the available records support:

```markdown
# Standup — [date]

## Done
- [Completed outcome and who recorded it]

## In progress
- [Work underway and its current state]

## Blocked or waiting
- [Blocker or request, who can act, and what is needed]

## Next
- [Likely next work, based on current plans or recorded handoffs]

## Decisions needed
- [Question and decision owner, if any]
```

Omit empty sections. If the records conflict or are stale, say so instead of guessing. Keep the report concise and link or point to the source entries when useful.

## Follow-through

Surface stale work, unanswered requests, and unresolved blockers. Take action only when it is within the current task and the agent's authority; otherwise identify who needs to decide or act. Record new work outcomes in the appropriate activity or agent memory using the required [agent-log procedure](../../protocols/agent-log.md). A standup report does not replace those records.

Run standup when requested or at a cadence the team has agreed on. Saving historical reports is optional; if the team chooses to save them, agree on a location and format first.
