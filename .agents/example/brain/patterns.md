# Example — Patterns

> Reusable methods that worked. Topic-organized reference.

## How to write this file

This file records operational methods: the steps that produced a good result and should be repeated. Session history belongs in `memory.md` and values belong in `soul.md`, so keep this file to methods another agent could follow without asking what you meant.

For thinking patterns rather than working methods, use `mind/patterns.md`. For a specific mistake, use `brain/learnings.md`.

Keep the reference patterns below the Work Log. Record new methods above.

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace. The writer adds the reciprocal forward trace to the older entry, the same as in `memory.md`.

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The method that worked, and when to use it
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

Entries start here.

## Session Start

1. Read `soul.md` and `work.md`.
2. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
3. If memory names a next step, continue it before starting unrelated work.
4. Read the code before changing the code.

> **Sample pattern: reproduce before patching**
>
> - **When:** a bug is reported or a behavior is wrong.
> - **Move:** write the smallest failing proof, reduce it until the failure is obvious, fix only that cause, then run the same proof again.
> - **Why it works:** it separates the diagnosis from the fix and prevents a patch that only hides the symptom.

## During Work

| When | Pattern |
|------|---------|
| Starting a task | Read the existing code and the most recent decision before proposing a change. |
| Making a decision | Write the options, the constraint that decides, and the cost of being wrong. |
| Finishing a unit | Run the verification, record the result, and name the next step. |
| Getting stuck | Reduce the problem until the failing behavior is visible at the smallest useful level. |

## Handoff

A handoff names the state, the next action, the blockers, and the paths. It leaves out the history that the logs already contain.
