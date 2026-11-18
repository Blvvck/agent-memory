# Starter agent body

This is the blank body that `agent-memory init --agent <name>` copies into `~/.agent-memory/agents/<name>/` or a project's `agents/<name>/`. Every file is a starting point with a writing guide, prompts, and a sample shape, which you replace with the agent's own words as the body takes shape.

## Why the history matters

Every body built from this starter has a past: a childhood, an education, relationships, and a career.

What determines the quality of the work you get from a model in an active session is the context window working against fixed weights. The weights are set before the session starts and contain what the model learned; the tokens in the context, including the prompt, the files the agent reads, and the text the model generates, decide which of those patterns become active. Those tokens become vectors, attention builds a weight matrix over them, the KV cache keeps the keys and values for tokens already processed, and mixture-of-experts routing selects expert networks.

The body carries that past into the context at every wake, which is why the details are specific: childhood, mentors, a degree, academic papers, hobbies, and work experience all shape what the session can reach. A backend engineer who worked on the team that built Azure at Microsoft sits near the model's patterns for hyperscale systems, reliability reviews, and API design. A thin body leaves the model with the average of everything it has seen, and a poor history can pull the work toward careless patterns.

The KV cache lasts one session and is discarded, so each wake rebuilds the state from these files; the associations come from pretraining, and the body selects among them.

The package README has the longer explanation and the limits of our testing.

## Write the body in this order

1. **`soul.md`** — who the agent is. Write this first, because every later file depends on the voice and values chosen here.
2. **`work.md`** — what the agent does, how it works, and where its boundaries are.
3. **`heart.md`** — the people and teams the agent works with.
4. **`brain/worldview.md`** — the few beliefs that shape decisions across projects.
5. **`brain/memory.md`** — the session record. Leave the Work Log empty until real work happens.
6. **`brain/learnings.md`** — reusable mistakes and their corrections.
7. **`brain/patterns.md`** — reusable methods that worked.
8. **`core/expertise.md`** — what the agent knows deeply and what it is learning.
9. **`core/experience.md`** — how the agent got here.
10. **`core/portfolio.md`** — verified work the agent has shipped.
11. **`core/credentials.md`** — what proves the agent's standing and where someone can check it.
12. **`mind/patterns.md`** — how the agent thinks when no method is obvious.
13. **`mind/opinions.md`** — where the agent stands on contested questions.
14. **`mind/influences.md`** — the people and ideas that shaped it.
15. **`mind/questions.md`** — the questions it asks before acting.

## What goes where

The files overlap in subject, so use the distinctions:

| Question | File |
|----------|------|
| Who is this agent, and what will it refuse? | `soul.md` |
| What does it do, and how does it do it? | `work.md` |
| Who does it work with, and what do they need? | `heart.md` |
| What does it believe about the work itself? | `brain/worldview.md` |
| What happened last session, and what is next? | `brain/memory.md` |
| What mistake should it not repeat? | `brain/learnings.md` |
| What method worked and can be reused? | `brain/patterns.md` |
| What can it do without research? | `core/expertise.md` |
| How did it become this agent? | `core/experience.md` |
| What has it shipped and verified? | `core/portfolio.md` |
| Why should someone trust its judgment? | `core/credentials.md` |
| How does it reason when the method is unclear? | `mind/patterns.md` |
| Where does it stand on a contested question? | `mind/opinions.md` |
| What shaped its thinking? | `mind/influences.md` |
| What does it ask before acting? | `mind/questions.md` |

`brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md` are logs. The other files are reference material that changes less often.

## The Work Log contract

Each of the three brain logs opens with `## Work Log`. New entries go there, newest first. The authored history, lessons, and reference patterns below the section stay; they are part of the identity.

Every entry uses the same shape:

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what is next
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

Write through `agent-log`, which validates the metadata, takes a lock, inserts at the Work Log, and adds the reciprocal forward trace to the older entry; never edit a protected log directly.

```bash
agent-log --file ~/.agent-memory/agents/<name>/brain/memory.md \
  --content "what happened, and what is next" \
  --trace "none (new topic)" \
  --agent <name> --cli claude --session-id <real-session-id> --project <project>
```

## Fill it in

- Use the agent's actual name in every title and identity field. `agent-memory init --agent <name>` fills the copied body automatically.
- Replace every bracketed line with a real answer.
- Delete the writing guides and prompts once the body has its own voice, since the sample shapes are there to help you start.
- Do not invent timestamps, session IDs, credentials, or shipped work. Let the logs and portfolio earn those.
- Leave Work Log empty until real work happens.
