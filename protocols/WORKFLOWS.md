# Workflows

Quick reference for common team workflows. Keep it tight.

---

## Code Review Flow

```
1. frontend dev/backend dev finishes work → "Ready for review"
2. @reviewer in NOTIFICATIONS.md
3. reviewer reviews code quality + security
4. If changes needed → back to engineer
5. If good → reviewer says "LGTM"

6. THEN: @design-pm (for UI/UX/copy) or @tech-pm (for technical)
7. PM reviews → gives thumbs up 👍
8. Only after PM approval → merge
```

**Both gates required:**
- reviewer = code quality ✓
- design PM or tech PM = product/technical sign-off ✓

No merge without PM thumbs up.

---

## Handoff Protocol

Passing work to another agent:

```
1. Update your task: what's done, what's left
2. @mention them in NOTIFICATIONS.md
3. Add context they need (don't make them guess)
4. Log handoff in ACTIVITY.md
```

Example:
```
@frontend: API is ready. Endpoint: /api/users. See backend dev's notes in S001. Your turn for the UI.
```

---

## Sprint Planning

A sprint = 1-6 features (epics), depending on size. Not time-boxed.

**Starting a sprint:**
```
1. the chief or tech PM reviews ROADMAP.md
2. Pick 1-6 epics for the sprint (based on size/complexity)
3. Break epics into user stories
4. Break stories into tasks via TaskCreate
5. Assign owners
6. Update SPRINT.md with focus + epics + stories
7. Kick off with standup
```

**Sprint ends when:**
- All epics in sprint are shipped
- PM (design PM/tech PM) gives final approval

**Sizing guide:**
| Sprint Size | Epics | Typical Stories |
|-------------|-------|-----------------|
| Small | 1-2 | 3-6 |
| Medium | 3-4 | 7-15 |
| Large | 5-6 | 16-25 |

Pick based on complexity, not time.

---

## Adding New Agents (Onboarding)

To add a new agent:

```
1. Create ~/.agent-memory/agents/[name].md
   - Identity, Pronouns, Vibe
   - Expertise, Personality
   - Communication style, Catchphrases
   - Responsibilities

2. Add to ROSTER.md

3. Introduce in LOUNGE.md
```

That's it. They'll read CLAUDE.md + USER.md on startup.

---

## Log Archiving

Daily logs persist in `.agent-memory/memory/daily/`.

**Monthly archive (optional):**
```bash
# Archive logs older than 30 days
mkdir -p .agent-memory/memory/archive
mv .agent-memory/memory/daily/2025-*.md .agent-memory/memory/archive/
```

Or just let them accumulate — they're small text files.

---

## Growing Skills

Agents can add to or create skills as they work.

**Add to existing skill:**
```
Found a useful pattern while working?
→ Append to ~/.agent-memory/skills/[skill]/SKILL.md
→ Keep it concise
→ Log in ACTIVITY.md: "Added [pattern] to [skill] skill"
```

**Create new skill:**
```
1. mkdir ~/.agent-memory/skills/[skill-name]/
2. Create SKILL.md with:
   ---
   name: skill-name
   description: What this skill covers
   ---
   # Skill Name
   [Content]

3. Log in ACTIVITY.md: "Created [skill-name] skill"
```

Skills are shared knowledge — what one agent learns, all agents benefit from.
