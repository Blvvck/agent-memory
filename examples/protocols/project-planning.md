# Optional Project Planning

Use this procedure when a project opts into the `work/` planning module. It supplements `CONTEXT.md` and `ACTIVITY.md`; a project does not need a backlog, feature specs, or sprints to use Agent Memory.

## Work hierarchy

```text
Idea → Feature specification → Epic → Story → Task
```

- An idea records a problem or opportunity.
- A feature specification describes user value, scope, constraints, and success measures.
- An epic groups related deliverables toward one user outcome.
- A story describes one verifiable increment of user value.
- A task is implementation work needed to complete a story.

Store feature material under the selected project memory directory's `work/features/`. The optional work scaffold includes `FEATURE_SPEC_TEMPLATE.md`.

## Planning a feature

1. Capture a useful idea in project `IDEAS.md` or `work/BACKLOG.md`.
2. Read the complete feature request, including linked requirements and appendices.
3. Create a feature specification from `FEATURE_SPEC_TEMPLATE.md` and identify the user problem, scope, constraints, success measures, dependencies, risks, and open questions.
4. Break the feature into epics and stories. Give each story one owner, a clear outcome, and acceptance criteria that can be observed or verified.
5. Reconcile planned stories against the specification's deliverables. Check for duplicate work, missing dependencies, and work that has no owner or integration path.
6. Include privacy, security, failure behavior, and verification in the plan where relevant.
7. Review the plan with people responsible for implementation and acceptance before committing to it.

Prefer observable acceptance criteria, for example:

```text
**Verify:** A user can export the selected records, and the downloaded file contains the expected fields.
```

## Scope and status

Keep the project `CONTEXT.md` as the source for lasting project constraints. Use the backlog for unscheduled work and the sprint plan for current work. Record completed work and decisions in `ACTIVITY.md` and the responsible agent's memory through the required [agent-log protocol](../../protocols/agent-log.md). If the project uses sprints, follow the optional [sprint lifecycle](sprint-lifecycle.md) as well.
