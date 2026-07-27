# Set Up a New Project

Use `agent-memory init` to scaffold the project's memory files and connect its harnesses.

## Choose one project memory layout

Run setup from the project directory and choose exactly one layout:

```bash
agent-memory init --project --layout <standard|claude|codex|opencode|antigravity|cursor> --harness <harnesses>
```

The chosen layout provides one project instruction entry and one memory directory. Additional harnesses can be connected later, but they must share that selected memory directory. Do not scaffold multiple memory directories for the same project.

The installer creates the project context and activity files, records the selection in `.agent-memory-layout`, and writes native hook or plugin configuration for the chosen harnesses. It also installs the required Agent Memory protocols globally under `~/.agent-memory/protocols/`.

## Finish setup

1. Read this protocol and follow the installer prompts for layout and harnesses.
2. Review the generated instruction entry and hook configuration for each selected harness.
3. Fill in `CONTEXT.md` with the project's purpose, constraints, and important decisions.
4. Confirm the generated `ACTIVITY.md` is in the selected memory directory; agents use it as the project's work log.
5. Add optional planning or team files only if the people using the project choose those workflows. Setup records the installed modules in `MODULES.md`; consult the [optional protocol index](../examples/protocols/README.md), especially [project planning](../examples/protocols/project-planning.md), [sprint lifecycle](../examples/protocols/sprint-lifecycle.md), [file updates](../examples/protocols/file-updates.md), and [team coordination](../examples/protocols/team-coordination.md), when those modules are selected.
6. Restart the selected harnesses and confirm they load the generated instructions and hooks.

To connect another harness later, run `agent-memory init --project --harness <harness>` from the same project. Keep the existing layout selection; do not choose another layout.
