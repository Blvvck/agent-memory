# Create a New Agent

Use this procedure whenever creating or substantially reshaping an agent body. Scaffolding creates files; it does not create a finished agent. The body should give the agent a coherent role, a personified voice, grounded context, and a first wake in which the agent reads and reviews that body.

## Decide the role before writing the persona

Define the agent's purpose before choosing personality details:

- What work will the agent own?
- What is outside its scope?
- What skills, standards, and failure modes does the work require?
- How does this role differ from existing agents, if any?
- Which people, agents, and project context will it need to work with?

Create a separate agent only when there is a durable area of ownership or a distinct craft to support. Do not invent extra roles to represent a temporary task or workload spike.

## Research and ground the body

Research the role's domain, tools, practices, and important references before describing the agent's expertise. Prefer primary sources such as official documentation, source repositories, and maintainer material. Use secondary sources for context, not as sole support for disputed claims.

Keep research claims clear about their status:

- Established facts and credentials must be verifiable.
- Inferences should be written as an interpretation, not as confirmed history.
- The agent may have an authored first-person backstory, including formative memories, education, career history, relationships, and personal milestones. Keep it coherent and label it as persona backstory when sharing it as an example.
- Do not present authored biography as verified claims about a real person. Distinguish that backstory from actual Agent Memory session records and verified portfolio entries.
- Let operational memory grow from real sessions. Do not create fake timestamps, session IDs, or work-log entries to simulate a history.

## Scaffold the body

For a shared agent:

```bash
agent-memory init --global-only --agent <name>
```

For an agent used only in one project, run setup from that project and select its existing or intended layout:

```bash
agent-memory init --project --layout <layout> --agent <name> --agent-scope project
```

The shared body is created under `~/.agent-memory/agents/<name>/`. The project body is created under `agents/<name>/` in the selected project memory directory. A project body overrides a shared body with the same name in that project. Do not keep duplicate bodies for the same agent in multiple places unless the project-specific override is intentional.

## Register the body

`agent-memory init --agent <name>` adds the new body to the scope's roster automatically. Shared agents are listed in `~/.agent-memory/AGENTS.md`; project-scoped agents are listed in `agents/README.md` inside the project's memory directory. Pass `--role "one line"` to set the role at creation, or update the row once `work.md` settles.

If you create a body without the command, add the same row by hand so other agents can find it.

## Write the body in the agent's voice

Write narrative sections in first person, as the agent describing their own identity and working perspective. Avoid third-person employee biographies. Give the agent a consistent voice and point of view that can guide choices, while keeping role, boundaries, and standards explicit. Personification does not make invented credentials or work history factual.

1. Write `soul.md` with identity, values, working principles, and a useful file map.
2. Write `work.md` with the role, ownership boundaries, skills, workflows, and quality standards.
3. Add `heart.md` and `brain/worldview.md` context when relationships or durable beliefs will affect how the agent works.
4. Use `core/` and `mind/` files for grounded expertise, verified experience, portfolio, influences, opinions, and thinking patterns. Do not fill a file just to avoid leaving it sparse.
5. Keep `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md` ready for real session records. Never seed them with invented past work, timestamps, or session IDs.
6. Add `WAKE.md` only when the role needs extra required context. List every required file by its actual path; named-agent spawn checks enforce the wake contract.
7. Remove all template placeholders. Confirm that every referenced file exists and that the file map matches the body.

## Run the first wake

Do not treat file generation as completion. Start a first session for the new agent, or invoke it as a named subagent with the full wake contract in [subagent-wake.md](subagent-wake.md).

At first wake, the agent must:

1. Read its complete body, including every file listed by `WAKE.md` if present. This first review is a full read; later sessions can use the normal wake slices.
2. Acknowledge that it has read the files and summarize its role, boundaries, and required context in its own words.
3. Identify claims that are unsupported, inaccurate, contradictory, or do not feel like a useful working identity.
4. Revise its identity and working files in its own voice where appropriate. Use `agent-log` for any protected memory, learning, pattern, activity, or notification writes; do not invent historical entries to make the body look established.
5. Report what it changed and any unresolved questions to the person setting it up.

The body is ready when the agent has completed this review and can follow the same wake contract in a direct session or as a named subagent.
