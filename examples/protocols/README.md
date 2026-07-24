# Protocol examples

These examples show ways to connect agent instructions to the body and memory structure in this repository. They are optional starting points, not required Agent Memory behavior. Adapt paths, lifecycle events, and writer commands to your setup and harness.

| Example | Use it for |
|---|---|
| [Session lifecycle](session-lifecycle.md) | Reading context at wake and recording useful state during work, before compaction, and at session end |
| [Subagent wake](subagent-wake.md) | Passing a named agent's identity and required context into a delegated task |
| [Memory entry and traces](memory-entry-and-traces.md) | Choosing what to record and linking related entries |

Each procedure should be wired to the lifecycle events your harness actually provides. If an event is unavailable, use the closest reliable checkpoint and keep the same memory contract.
