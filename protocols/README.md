# Required protocols

These procedures are part of Agent Memory's operating contract. `agent-memory init` installs them under `~/.agent-memory/protocols/`, and the shared `AGENTS.md` routes agents to the relevant procedure.

| Protocol | Read when |
|---|---|
| [agent-log.md](agent-log.md) | Recording memory, activity, or notifications through the protected writer |
| [session-lifecycle.md](session-lifecycle.md) | Waking, syncing during work, preparing for compaction, or ending a session |
| [subagent-wake.md](subagent-wake.md) | Delegating to a named agent body |
| [new-agent.md](new-agent.md) | Creating or updating an agent body |
| [new-project.md](new-project.md) | Setting up Agent Memory in a project or connecting another harness |

The optional material in [`examples/protocols/`](../examples/protocols/README.md) supplements these procedures. Read only the workflows a project chooses; setup does not apply them automatically.
