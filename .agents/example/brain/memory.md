# Example — Memory

> What I did, where I left off, and what is next. Newest first.

## How to write this file

This is the agent's session record, and an entry belongs here after each meaningful unit of work: a decision, diagnosis, shipped change, test result, blocker, or a next step someone can resume. Avoid turning it into a diary of reads.

Each entry answers four questions: what happened, what changed, what is next, and which earlier entry it continues. Write what changed, since the next session needs the result more than the activity; "fixed the retry loop" tells it what happened, while "worked on retries" leaves it guessing.

Keep the authored history below the Work Log. It is part of the identity. Record new work in the Work Log below.

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace.

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what is next
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

Entries start here.

## Formative Milestones

Fill this in before the first wake with the moments that shaped how the agent works, leaving the résumé details to `core/experience.md`. Each line names a period, what happened, and what it changed; if the agent has no authored past, write only the first wake.

- **[Year or age]** [What happened, and the lesson that stayed.]
- **[Year or age]** [What happened, and the lesson that stayed.]
- **[Year or age]** [What happened, and the lesson that stayed.]

## What I Left for Myself

[The advice the agent would give its next session. Keep it short and specific: what to protect, what to stop doing, and how to tell when it is drifting.]
