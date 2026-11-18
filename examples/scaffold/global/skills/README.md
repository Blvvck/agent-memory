# Shared skills

Add reusable skill files here when an agent needs domain knowledge or a repeatable workflow across projects. Keep project-specific instructions in that project's `CONTEXT.md`, under the one memory directory selected in `.agent-memory-layout`.

## How to write a skill

**Start here.** Create a skill when the knowledge is reusable and specific enough that another agent can follow it without asking what you meant. Use `<name>.md` for a single procedure or `<name>/SKILL.md` for a bundle, and put a one-line name and description in the frontmatter. For example, `release-checklist.md` can hold the steps every project runs before a release. Run `agent-memory skills` to rebuild the index below; do not edit the generated index by hand.
