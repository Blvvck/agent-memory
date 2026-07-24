# Session lifecycle example

Use this as a starting point for connecting an agent's body to its session lifecycle. Map each checkpoint to the events available in your harness; event names and capabilities differ across runtimes.

## Wake

1. Read the agent's identity and role files, followed by its worldview and relationship context.
2. Read the newest entries from its memory, learnings, and patterns files.
3. If the agent has a `WAKE.md`, read it and every file it requires before acting.
4. Check the current task and relevant project context. Do not load unrelated history by default.

## During work

After a meaningful decision, discovery, completed unit of work, or blocker, record a concise memory entry in the appropriate file. Keep a brief current-state note when work is still in progress so another session can resume without reconstructing the whole conversation.

## Before context compaction

If the harness offers a pre-compaction event, capture only state that could be lost: the current objective, decisions, completed work, remaining steps, and relevant file locations. Write it through the configured memory writer. Do not copy the whole conversation into long-term memory.

If there is no pre-compaction event, use periodic checkpoints or the harness's nearest reliable summary event.

## Session end

1. Record the outcome and the next actionable step, including unresolved questions or blockers.
2. Add reciprocal traces to related entries when the memory format supports them.
3. Use the configured writer for protected or validated memory files.

Keep the entry short enough to scan at the next wake. Store durable decisions and useful context, not a transcript of routine actions.
