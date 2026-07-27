# Skills

A skill is a reusable procedure that saves an agent from solving the same problem twice. Skills are Markdown files, so every harness can read them and git can version them.

## Where they live

| Scope | Directory |
|-------|-----------|
| Shared | `~/.agent-memory/skills/` |
| Project | `skills/` inside the project's selected memory directory |

Each skill is `<name>.md` or `<name>/SKILL.md`. Optional frontmatter gives the index a clean name and description:

```markdown
---
name: deploy
description: Deploy the service and verify the health check
---
```

Without frontmatter, the file or directory name becomes the skill name and the first paragraph becomes the description.

## Add or update a skill

1. Write the skill as a file in the scope's `skills/` directory.
2. Run `agent-memory skills` to rebuild the index.
3. Read only the skills relevant to the task. The index is a catalog.

`agent-memory init` rebuilds the index too, so a fresh setup picks up skills that already exist.

## What belongs in one

Record a procedure that worked and that another session would otherwise have to rediscover: the situation, the steps, the verification, and the failure modes.

Keep project-specific details in the project scope and cross-project methods in the shared scope. One canonical copy per skill; do not maintain a second version in another harness.

## Reuse an existing harness skill directory

Link it into the shared skills directory once:

```bash
ln -s ~/.claude/skills ~/.agent-memory/skills/claude
```

The index follows the link and reads the flat Markdown files and `<name>/SKILL.md` directories inside it.
