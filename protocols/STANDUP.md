# Standup Protocol

the chief reads the logs and reports. One agent synthesizes team status rather than switching between agents.

---

## How to Run

Say: `/standup` or `"Run standup"`

---

## What the chief Does

### 1. Read the State

| File | What to Check |
|------|---------------|
| `.agent-memory/comms/ACTIVITY.md` | What's been completed in THIS project |
| `.agent-memory/LEADERBOARD.md` | Sprint state and scores for THIS project |
| `~/.agent-memory/comms/NOTIFICATIONS.md` | Anyone waiting? Any blockers? |
| `.agent-memory/work/SPRINT.md` | Story status (done/in progress/blocked) |
| `~/.agent-memory/LOUNGE.md` | Recent team updates (filter by project tag) |

### 2. Synthesize Report

```markdown
# Standup — [DATE]

## Done Recently
- [Agent]: [What they completed]

## In Progress
- [Agent]: [Story/task] — [status]

## Waiting/Blocked
- [Any @mentions pending]
- [Any blockers logged]

## Needs Attention
- [Stale items, if any]
- [Decisions needed from the user]

## Next Up
- [What should happen next based on SPRINT.md]
```

### 3. Handle Issues

If standup reveals:
- **Stale notification** → Handle it NOW
- **Stuck story** → Investigate or reassign
- **Blocker** → Escalate or solve
- **Handoff waiting** → Pick up or assign

Don't just report problems — fix them.

---

## When to Run

- When the user asks
- Start of a work session
- Before major decisions
- Anytime you need to sync on status

---

## Notes

- Takes 30-60 seconds, not a meeting
- the chief reads state files — no need to switch between agents
- Any agent can read ACTIVITY.md to know what happened in previous sessions
- If something needs attention, handle it immediately
- During active work, there shouldn't be stale items

---

## Storage (Optional)

If the user wants standup history:
```
.agent-memory/comms/standups/[DATE].md
```

Otherwise, just report and move on.
