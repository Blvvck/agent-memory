# Role-based agent body examples

These complete, editable bodies demonstrate different roles and personified writing styles. Their backstories are authored persona material, not verified biographies of real people. Preserve or adapt the formative history as part of the agent's identity. Where a source body had no childhood or education, the example supplies authored persona material and labels it as such in the files.

The bodies carry real working experience adapted from the agents they were built from, with private names, projects, and session records removed. Each `brain/memory.md` opens with a labeled `Formative Milestones` section: authored persona history, not Agent Memory session records, with no invented timestamps or session IDs. The `Recent Sessions` section is empty on purpose, and real work should be recorded there with `agent-log` once the body is in use. The same applies to `brain/learnings.md` and `brain/patterns.md`, which hold reusable lessons and methods rather than copied session logs.

Choose a body and copy its directory to a new agent location that does not already exist:

```bash
cp -R examples/agents/orchestrator ~/.agent-memory/agents/<name>
```

For a project-only body, copy it under `agents/<name>/` inside the project's selected memory directory. Then follow the required [new-agent procedure](../../protocols/new-agent.md) and complete the first wake before delegating work to the agent.

## Examples

| Role | Body | Background |
|---|---|---|
| Orchestrator | [orchestrator](orchestrator/) | Coordination, delegation, and synthesis |
| Design PM | [design-pm](design-pm/) | Product design, research, and experience quality |
| Technical PM | [technical-pm](technical-pm/) | Technical planning and delivery coordination |
| Frontend engineer | [frontend-engineer](frontend-engineer/) | Frontend systems and user-facing implementation |
| Backend engineer | [backend-engineer](backend-engineer/) | APIs, data, product services, and developer tools |
| QA engineer | [qa-engineer](qa-engineer/) | Quality, verification, and security review |
| DevOps engineer | [devops-engineer](devops-engineer/) | Infrastructure, delivery, and reliability |
| Terminal systems engineer | [terminal-systems-engineer](terminal-systems-engineer/) | CLI, TTY, PTY, process, and rendering behavior |
| ML systems engineer | [ml-systems-engineer](ml-systems-engineer/) | Model inference, compression, and deployment on constrained hardware |
| Head of Growth | [head-of-growth](head-of-growth/) | Acquisition, activation, retention, and expansion |
| Content Marketing Lead | [content-marketing-lead](content-marketing-lead/) | Editorial strategy, SEO-informed content, and voice |
| CRO/CFO | [cro-cfo](cro-cfo/) | Revenue operations and company finance |
| ML Engineer, Memory | [ml-engineer-memory](ml-engineer-memory/) | ML systems for memory and retrieval |
| AI Research Scientist | [ai-research-scientist](ai-research-scientist/) | Applied AI research |
| AI Safety Researcher | [ai-safety-researcher](ai-safety-researcher/) | Model behavior, evaluations, and safety research |
| Go Services Engineer | [go-engineer-services](go-engineer-services/) | Reliable service and API engineering in Go |
| Rust Memory Core Engineer | [rust-engineer-memory-core](rust-engineer-memory-core/) | Memory storage and core systems in Rust |
| Rust Protocol Engineer | [rust-engineer-protocol](rust-engineer-protocol/) | Protocol and distributed systems in Rust |

The bodies are starting points. Adapt names, role boundaries, tools, and context to the team using them. Keep project-specific instructions in the project's selected memory directory.
