# Memory entry and traces example

Use this as a guide for deciding what to retain after meaningful work. Follow the timestamp, metadata, and writer requirements defined by your Agent Memory setup.

## Choose the right file

| File | Record |
|---|---|
| `brain/memory.md` | What happened, what changed, and what should happen next |
| `brain/learnings.md` | A reusable lesson, including a correction that should prevent a repeated mistake |
| `brain/patterns.md` | A method that worked and when it is useful |
| `brain/worldview.md` | A lasting change in the agent's core beliefs |

Do not create an entry just because an action occurred. Preserve decisions, verified findings, useful discoveries, outcomes, and unresolved state that will matter later.

## Entry shape

```markdown
- [UTC timestamp] [project] @Agent [session:harness:ID]: Outcome, decision, or next step
  - ↪ trace: relates-to [timestamp] [project] @Agent [session:harness:ID]: Related entry
```

Use the configured entry format exactly. Keep entries concise, put newest entries first when the file uses a log, and use the protected writer when one is configured.

## Trace related work

When a new entry extends or corrects earlier work, point to the earlier entry with enough identifying context to find it. Add a forward trace to the older entry when the writer and workflow support reciprocal updates. Do not invent timestamps, session identifiers, or links; use the values already present in the source entry.

## Example

```markdown
- [2026-08-05T14:32:00Z] [sample-project] @Example [session:sample:abc123]: Verified the import path works; next, check the same flow on a clean install.
  - ↪ trace: relates-to [2026-08-04T16:10:00Z] [sample-project] @Example [session:sample:def456]: Import path investigation
```
