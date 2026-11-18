# Global and project scaffold

These templates separate an agent's global memory from each project's context and work history. Copy them into the matching locations in your Agent Memory directory and project; keep project files local to that project.

## Global agent system

The global directory is `~/.agent-memory/` by default. Its structure can include:

```text
~/.agent-memory/
├── agents/<name>/        # Copy .agents/example here for each agent
├── skills/               # Shared skills; create when you add one
├── protocols/            # Required procedures installed by agent-memory init
├── ACTIVITY.md           # Global and cross-project work
├── NOTIFICATIONS.md      # Requests needing attention
├── LOUNGE.md             # Shared discussion and announcements
├── TASKS.md              # Personal or cross-project follow-ups
└── LEADERBOARD.md        # Optional aggregate team scores
```

`agent-memory init` installs the required procedures into `~/.agent-memory/protocols/`. It also creates the global activity and notification files, and any optional global team files you select. Add one agent body per directory under `agents/`, starting from the generic [`.agents/example/`](../../.agents/example/README.md) or choosing a role-based body from [`examples/agents/`](../agents/README.md). The generic template explains what to write in each file, in what order, and where new log entries start. Optional procedures are in `examples/protocols/`.

## Project defaults

Every project can have a `.agent-memory/` directory with these three files at its root. A harness-tailored setup can use `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/` for the same files; hooks recognize all six locations across harnesses. The installer records the selected location in the project's `.agent-memory-layout` marker.

```text
.agent-memory/
├── CONTEXT.md            # Project overview and local instructions
├── ACTIVITY.md           # Work log for this project
└── IDEAS.md              # Project ideas not tied to current work
```

`agent-memory init` creates these project files. Agents record project work in that project's `ACTIVITY.md`; cross-project or global work belongs in `~/.agent-memory/ACTIVITY.md`.

`ACTIVITY.md` and `NOTIFICATIONS.md` are protected logs. They open with a `## Work Log`, carry the entry format, and are written through `agent-log`. The other files are working documents: each template explains what belongs in it, where to start writing, and what a useful entry looks like, and none of them require the protected writer.

## Optional project modules

Copy `project-work/` into the selected project memory directory only if you want structured planning. See the optional [project planning](../protocols/project-planning.md) and [sprint lifecycle](../protocols/sprint-lifecycle.md) procedures for how to use these files:

```text
.agent-memory/work/
├── SPRINT.md
├── BACKLOG.md
└── features/             # Feature specs and breakdowns
```

Copy `project-team/` only if you want project-specific discussion and score tracking (`LOUNGE.md` and `LEADERBOARD.md`). The optional [team coordination](../protocols/team-coordination.md), [file updates](../protocols/file-updates.md), and [standup](../protocols/standup.md) procedures can help teams use their chosen files. The core scaffold does not require sprints, a leaderboard, a lounge, a `comms/` directory, or a project `COMMANDS.md`.

`agent-memory init` copies these templates into the global and project locations you choose, while keeping existing files. It always installs the required protocols. Optional procedures are documented in [`examples/protocols/`](../protocols/README.md) and remain separate so users can choose whether to use those workflows.
