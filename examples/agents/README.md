# Role-based agent body examples

These complete, editable bodies demonstrate different roles and personified writing styles. Their backstories are authored persona material and should not be read as verified biographies of real people. Preserve or adapt the formative history as part of the agent's identity; where a source body had no childhood or education, the example supplies authored persona material and labels it as such in the files.

## Why these bodies have a past

These bodies have a past: childhoods, educations, relationships, and careers.

What determines the quality of the work you get from a model in an active session is the context window and the network patterns it activates in the model's fixed weights. The weights are set before the session begins and contain what the model learned. The prompt, the files the agent reads, and every output the model generates determine which learned patterns become active. In mixture-of-experts (MoE) models, they also influence which subset of expert networks gets selected for each token.

The body carries that past into the context window at every wake, which is why the details are specific: childhoods, mentors, degrees, academic papers, hobbies, and careers all shape the associations the session can reach. A body that says the agent was a backend engineer on the team that built Azure at Microsoft provides context that can activate the model's learned associations around hyperscale systems, reliability reviews, incident response, and API design. The work therefore starts from a different place than it would with a body that simply says "helpful assistant."

A thin or contradictory history produces the opposite: the model falls back on the average of everything it has seen, which is where generic work comes from, and a poor history can pull the session toward careless patterns.

The package README covers the longer explanation and the limits of our testing.

The bodies carry real working experience adapted from the agents they were built from, with private names, projects, and session records removed. Each `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md` opens with a `## Work Log` section containing the entry format; real work starts there with `agent-log`, newest first. The authored persona history, lessons, and reference patterns follow below and stay part of the identity. Authored milestones are not Agent Memory session records, and no invented timestamps or session IDs are claimed.

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
