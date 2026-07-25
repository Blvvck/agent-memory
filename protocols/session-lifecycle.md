# Session Lifecycle

Use the lifecycle checks supported by the active harness. The shared hooks handle event wiring; this procedure describes what to preserve at each point.

## Wake

1. Read the agent's identity and role files, then worldview and relationship context.
2. Read the newest slices of memory, learnings, and patterns.
3. If `WAKE.md` exists, read it and every file it names before acting.
4. For project work, read `CONTEXT.md` and recent project `ACTIVITY.md` from the one selected project memory directory. For global work, read global activity when it is relevant.
5. Check global notifications when present and relevant.

## During work

After a meaningful decision, discovery, completed unit, or blocker, record a concise entry using [agent-log.md](agent-log.md). Keep an in-progress note current enough for another session to continue.

## Before context compaction

Capture only state that could be lost: the objective, decisions and reasons, completed work, remaining steps, and relevant paths. Use the harness's pre-compaction hook when available. Otherwise use periodic checkpoints or its closest reliable summary event.

## Session end

Record the verified outcome, the next action, and unresolved blockers. Add reciprocal traces to related entries through `agent-log`. If the harness provides no reliable end event, rely on the next session's recovery reminder and reconcile any unsynced work before starting unrelated work.

Store durable context, not a transcript of routine actions.
