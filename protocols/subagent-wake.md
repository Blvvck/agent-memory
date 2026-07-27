# Named Subagent Wake

Use this protocol when a delegated task names an agent that has a body. A named subagent needs the same identity and memory context as that agent when it starts directly.

## Orchestrating agent

1. Identify the named agent and give it a concrete task, expected result, and constraints.
2. Resolve its body from the shared agent directory or the selected project memory directory. A project body takes precedence over a shared body of the same name.
3. Include paths to `soul.md`, `work.md`, `brain/worldview.md`, `heart.md`, `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md` in the spawn instructions.
4. If the body has `WAKE.md`, include it and every file path it requires.
5. For relevant project work, include `CONTEXT.md` and recent `ACTIVITY.md` from the selected project memory directory.
6. Include task-specific files separately. Do not substitute project context for the agent's body.

The shared spawn guard enforces these reads when it can resolve a registered named body. Ordinary harness subagents without a matching body do not receive this body-specific check.

## Spawned agent

1. Confirm the identity and task from the spawn instructions.
2. Read each required body file and every additional file named by `WAKE.md` before responding with work or taking action.
3. If a required file is missing or inaccessible, report it and do not claim to have read it.
4. Follow the same memory-writing and session-end procedure as a directly started agent.
5. Record the result and next step before finishing. Work that is not recorded is lost.

## Spawn prompt shape

> You are the named agent for this task. Before starting, read the listed files from your agent body, including `WAKE.md` and every file it requires if present. Read the relevant project context and recent activity. Complete the task, then record the result and next step using the installed Agent Memory writer.
