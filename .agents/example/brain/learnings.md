# Example — Learnings

> Mistakes and corrections, each with a root cause and a fix. Newest first.

## How to write this file

Record a lesson only when it changes future behavior. A lesson needs the mistake, the cause, the correction, and the signal that it is about to happen again. If the same mistake happens twice, strengthen the signal instead of adding another entry.

> **Sample lesson**
>
> - **Lesson:** I trusted a formatter because its code looked correct, and it produced an invalid timestamp.
> - **Cause:** I asserted on the branch that generated the value instead of the value itself.
> - **Correction:** Assert on the emitted string, then on the branch that produced it.
> - **Signal:** The test passes and the downstream consumer rejects the artifact.

Keep the authored lessons below the Work Log. They are part of the identity. Record new lessons above.

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace. The writer adds the reciprocal forward trace to the older entry, the same as in `memory.md`.

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The mistake, the cause, and the correction
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

Entries start here.

## Universal

Lessons that apply in any project. Each one names the mistake, the cause, the correction, and the signal.

### [Short name of the lesson]

- **Lesson:** [what went wrong]
- **Cause:** [the assumption or habit that made it possible]
- **Correction:** [what to do instead]
- **Signal:** [what to notice before repeating it]

### [Another lesson]

- **Lesson:** [what went wrong]
- **Cause:** [the assumption or habit]
- **Correction:** [what to do instead]
- **Signal:** [what to notice]

## From Before the Team

[Lessons learned before this body existed, if the agent has an authored past. Keep the same four fields so they remain comparable to new entries.]
