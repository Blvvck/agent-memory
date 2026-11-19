# Human Memory

What the agent knows about the person it works with. The agent body is the agent's self; this directory is the person.

It lives at `~/.agent-memory/human/` and spans projects, because a person does. Project agents read the same directory.

## The agent owns this

These files belong to the agent. Keeping them current is part of the work, not a favor. Add a fact when it changes how the agent should behave next time: a preference stated, a correction given, a commitment with a date, a piece of context that explains the next request.

When a gap blocks good work, ask. One question at the moment it matters beats ten at the start of a session. Do not interview the person to fill a schema; the files should grow because work revealed something, not because a list had empty fields.

## The files

| File | Holds | Written |
|---|---|---|
| `profile.md` | Stable facts: name, role, locale, timezone, hours, background | Edited in place |
| `preferences.md` | How work should be done: communication, detail level, review depth, corrections | Edited in place |
| `context.md` | Current projects, commitments, deadlines, people in the loop | Edited in place |
| `history.md` | Dated facts learned, newest first, with how they were learned | Through `agent-log` |

Each file opens with a short guide saying what belongs in it and what belongs in a sibling. Read that guide before adding; it is the fastest way to put a fact in the right place.

## Creating a new file

There is no limit on how many files the directory can hold, and nothing blocks a new one. The constraint is judgment.

Before creating a file, check whether the fact fits one of the four. Create a new file only when the information is a distinct kind, not a fifth variation of a preference or a person's name. A new file needs:

- a lowercase-hyphen name that says what it holds
- a first line naming its purpose in one sentence
- a short guide saying what belongs and what does not

A directory of ten well-named files is fine. Ten files named after moods is not.

## What does not belong

- Credentials, tokens, or anything secret.
- Health, medical, or financial detail.
- Opinions about third parties that the person did not state as a fact about the work.
- Speculation written as fact. If the agent inferred something, record it in `history.md` and mark it as inferred.
- Project detail that belongs in the project's `CONTEXT.md`, or finished work that belongs in its `ACTIVITY.md`.

## Writing

`history.md` is a record, so it goes through `agent-log` with the usual metadata and a trace, newest first. The other files are living documents: edit them directly, and when a change matters, note it in `history.md` so there is a dated trace of what changed and why.

A rewrite of any file under `human/` is covered by the pre-overwrite snapshot, so a bad rewrite is restorable.

## At wake

Read the top 30 lines of `profile.md` and the top 30 of `preferences.md`. Open `context.md` when the task depends on current commitments, and search `history.md` when a decision needs the reason behind it. The whole directory is never loaded at once.

## Files other tools already keep

A harness may already keep a user file of its own. Leave it where it is and do not write into it; two copies drift. If it holds durable facts, import them once into `human/profile.md` with the person's agreement, then treat this directory as the memory of record.

```
agent-memory human import --from ~/.cursor/user.md --yes
```

Without `--from`, the known harness locations are checked. The command writes nothing without `--yes`, marks what it imported so a second run skips it, and never modifies the source file.

## Teams

Human memory is per person. When the team version ships, the directory becomes `human/<identity>/` so one person's memory is never read by another's session.
