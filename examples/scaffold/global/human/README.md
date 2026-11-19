# Human

What the agent knows about the person it works with. The agent owns these files and keeps them current.

- `profile.md` — stable facts about the person.
- `preferences.md` — how they want work done.
- `context.md` — what they are working on now.
- `history.md` — dated facts learned, through `agent-log`.

Add a fact when it changes how the agent should behave next time. Ask when a gap blocks good work, and do not turn a session into an interview.

A new file is allowed. Before creating one, check whether the fact fits an existing file; create a new one only when it is a distinct kind of information, and open it with a one-line purpose.

Read the procedure in `~/.agent-memory/protocols/human.md`.
