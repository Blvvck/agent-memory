# Subagent wake example

Use this when delegating work to a named agent that has its own body. The spawned agent should receive the same identity and memory context it would need when starting a session directly.

## Spawning agent

1. Identify the agent and give it a concrete task, expected result, and relevant constraints.
2. Include the paths to the agent's identity, role, worldview, relationship context, and recent memory files in the spawn instructions.
3. If the body has a `WAKE.md`, include it and every file it names as required context.
4. For project work, include `CONTEXT.md` and recent `ACTIVITY.md` from the project's one selected memory directory, as recorded in `.agent-memory-layout`, when they exist and are relevant to the task.
5. Include other task-specific files separately; do not substitute project context for the agent's own body.
6. If the harness supports spawn validation, check the required paths before dispatch. Otherwise, ask the spawned agent to verify and read them before beginning.

## Spawned agent

1. Confirm the identity and task from the spawn instructions.
2. Read each required body file and any additional files required by `WAKE.md` before responding with work or taking action.
3. If a required file is missing or inaccessible, report that clearly and continue only with work that does not depend on it.
4. Follow the same memory-writing and handoff rules as a directly started session.

## Example spawn instructions

> You are the named agent for this task. Before starting, read `soul.md`, `work.md`, `brain/worldview.md`, `heart.md`, `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md` from your agent directory. Check for `WAKE.md`; if it exists, read it and every file it lists. Then inspect the task-specific files listed below and complete the task. Before finishing, record the result and next step in the appropriate memory file using the configured writer.

Replace the example paths and file list with the actual body structure. Do not assume every agent uses the same directory layout.
