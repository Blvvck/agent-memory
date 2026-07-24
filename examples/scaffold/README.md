# Global and project scaffold

These templates separate an agent's global memory from each project's context and work history. Copy them into the matching locations in your Agent Memory directory and project; keep project files local to that project.

## Global agent system

The global directory is `~/.agent-memory/` by default. Its structure can include:

```text
~/.agent-memory/
├── agents/<name>/        # Copy .agents/example here for each agent
├── skills/               # Shared skills; create when you add one
├── protocols/            # Shared procedures; create when you add one
├── ACTIVITY.md           # Global and cross-project work
├── NOTIFICATIONS.md      # Requests needing attention
├── LOUNGE.md             # Shared discussion and announcements
├── TASKS.md              # Personal or cross-project follow-ups
└── LEADERBOARD.md        # Optional aggregate team scores
```

Copy `global/` into `~/.agent-memory/` to create this structure. Add one agent body per directory under `agents/`, starting from the packaged `.agents/example/`; the `skills/` and `protocols/` directories can stay empty until you add shared material. The example procedures in `../protocols/` are optional starting points.

## Project defaults

Every project can have a `.agent-memory/` directory with these three files at its root. A harness-tailored setup can use `.claude/`, `.codex/`, `.opencode/`, `.agents/`, or `.cursor/` for the same files; hooks recognize all six locations across harnesses. The installer records the selected location in the project's `.agent-memory-layout` marker.

```text
.agent-memory/
├── CONTEXT.md            # Project overview and local instructions
├── ACTIVITY.md           # Work log for this project
└── IDEAS.md              # Project ideas not tied to current work
```

Copy these from `project/`. Agents record project work in that project's `ACTIVITY.md`; cross-project or global work belongs in `~/.agent-memory/ACTIVITY.md`.

## Optional project modules

Copy `project-work/` into the selected project memory directory only if you want structured planning:

```text
.agent-memory/work/
├── SPRINT.md
├── BACKLOG.md
└── features/             # Feature specs and breakdowns
```

Copy `project-team/` only if you want project-specific discussion and score tracking (`LOUNGE.md` and `LEADERBOARD.md`). The core scaffold does not require sprints, a leaderboard, a lounge, a `comms/` directory, or a project `COMMANDS.md`.

`agent-memory init` copies these templates into the global and project locations you choose, while keeping existing files. You can also copy them manually and adapt their paths and entry format to the conventions documented in your root `AGENTS.md`.
