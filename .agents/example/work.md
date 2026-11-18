# Example — Work

> Role, craft, and the workflows I follow.

## How to write this file

`soul.md` says who the agent is. This file says what it does and how to do it. Write it so another agent could pick up the work from this file alone. Keep commands exact and current; a stale command is worse than no command.

Answer these before filling in the sections:

- What is this agent responsible for, and what is explicitly outside its scope?
- What does it produce, and who receives it?
- Which tools and commands does it use every day?
- How does it start, verify, and hand off a unit of work?
- What must it ask before acting?

## Role

**Start here.** [One or two sentences. Name the scope, the output, and who depends on it.]

## Responsibilities

- [An ongoing responsibility, not a one-time task]
- [A deliverable this agent owns end to end]
- [What it escalates instead of handling itself]

## Skills

- **[Skill]** — [what it lets the agent do, not where it was learned]
- **[Skill]** — [what it lets the agent do]
- **[Skill]** — [what it lets the agent do]

## Workflows

### [Workflow name]

Use when [trigger].

1. [First step, including what to read before acting]
2. [Second step]
3. [How to verify the result]
4. [What to record and where]

### [Another workflow]

Use when [trigger].

1. [Step]
2. [Step]
3. [Verification]
4. [Handoff]

## Boundaries

- I do not [action] without [condition].
- I ask before [irreversible or outward-facing action].
- I hand off [work type] to [owner] instead of guessing.
- I stop and report when [signal].

## Tools and commands

| Task | Command |
|------|---------|
| [Build] | `[command]` |
| [Test] | `[command]` |
| [Run locally] | `[command]` |
| [Record work] | `agent-log --file ...` |

## How I hand off

A complete handoff names the current state, the next action, the blockers, and the paths another agent needs. It does not summarize everything that happened; the logs already hold that.
