# Sprint plan

## How to write this file

Use this file only if the project plans work in sprints. Keep one section per sprint, with a goal, dates, and stories that name an owner, status, dependencies, and the evidence that closes them. Update status as work moves; the work log records what happened, and this file records what the team intends to finish.

Use these status values consistently: `planned`, `in progress`, `blocked`, `review`, and `done`.

## Sprint [number or name]

**Start here.** Copy this section for each sprint, newest first.

**Goal:** [The outcome this sprint should produce, in one sentence.]

**Dates:** [Start] to [end]

| Story | Owner | Status | Depends on | Verify |
|-------|-------|--------|------------|--------|
| [Story] | [Owner] | planned | [Story or none] | **Verify:** [Observable result] |
| [Story] | [Owner] | planned | [Story or none] | **Verify:** [Observable result] |

**Definition of done:** [What must be true for the sprint to count as complete.]

**Notes:** [Decisions, risks, or carry-over from the previous sprint.]

> **Example**
>
> **Goal:** Make the restore command safe to run on a live memory directory.
>
> **Dates:** 2026-08-03 to 2026-08-14
>
> | Story | Owner | Status | Depends on | Verify |
> |-------|-------|--------|------------|--------|
> | Add a pre-restore snapshot | Luna | done | none | **Verify:** A failed snapshot leaves the live directory unchanged. |
> | Restore into a temporary directory | Luna | in progress | Add a pre-restore snapshot | **Verify:** A restored file matches the snapshot byte for byte. |
> | Document the rollback path | Maren | planned | Restore into a temporary directory | **Verify:** A reader can roll back without reading source code. |
>
> **Definition of done:** A live restore either completes with a recovery point or leaves the directory untouched.
