# File Update Protocol

Who updates what, and when.

---

## Global Files (`~/.agent-memory/`)

### LEADERBOARD.md (Global Aggregate)
**Owner:** the chief
**When:** End of every sprint

**Update checklist:**
1. Update project's `.agent-memory/LEADERBOARD.md` FIRST (see Project Files below)
2. Then update `~/.agent-memory/LEADERBOARD.md` aggregate:
   - Update agent totals in All-Time Standings
   - Update project breakdown in "Active Projects" section
   - Add to "Recent MVPs" section
3. If new project added, add to Active Projects list

**Format:**
```markdown
### Sprint [N] — [Focus]

| Agent | Tasks | Quality | Teamwork | Bonus | Sprint Pts |
|-------|-------|---------|----------|-------|------------|
| backend dev  | X     | +Y      | +Z       | +W    | **Total**  |
| frontend dev  | X     | +Y      | +Z       | +W    | **Total**  |
...

**MVP:** [Agent] 🏆 — [Reason]
```

---

### LOUNGE.md
**Owner:** Everyone
**When:** After shipping, finding something cool, celebrating wins

**Format:** `[DATE] [Agent]: [Message, 1-2 lines]`

---

### comms/ACTIVITY.md (Global)
**Owner:** the chief (for infrastructure work)
**When:** After global/cross-project infrastructure changes

Global ACTIVITY.md is for non-project work: skills, tools, protocols, team improvements.
Project-specific work goes in project's `.agent-memory/comms/ACTIVITY.md`.

---

### LOUNGE.md
**Owner:** Everyone
**When:** After shipping, finding something cool, celebrating wins

**Format:** `[DATE] [project-tag] [Agent]: [Message, 1-2 lines]`

Use `[project-name]` prefix for project-specific chat, no prefix for social/universal.

---

### comms/NOTIFICATIONS.md
**Owner:** Everyone
**When:** Need someone's attention

**Format:**
```markdown
### @[Agent] - [Subject]

[Message]

[Your name]
```

**Clear notifications** by moving completed items to ACTIVITY.md or deleting.

---

## Project Files (`.agent-memory/`)

### LEADERBOARD.md (Project-Specific)
**Owner:** the chief
**When:** End of every sprint for THIS project

**Update checklist:**
1. Add new sprint section with scores for each agent
2. Calculate points: `+1 task, +2 quality, +2 unblock, +1 idea, +1 share, +2 role bonus, -1 revision, -3 skipped gate`
3. Declare MVP (highest sprint points)
4. Update All-Time Standings table for this project
5. Award titles if earned
6. Add performance notes if relevant

**Then** update global `~/.agent-memory/LEADERBOARD.md` aggregate.

---

### comms/ACTIVITY.md (Project-Specific)
**Owner:** Everyone (logs own work for THIS project)
**When:** After completing significant work — **IMMEDIATELY, not in batches**

**Engineers (frontend dev, backend dev):** Log after completing stories with:
- Story ID and name
- Files changed
- Key implementation notes

**Reviewers (reviewer):** Log after completing reviews with:
- What was reviewed
- Verdict (LGTM / Changes requested)
- Key findings

**PMs (design PM, tech PM):** Log after approvals with:
- What was verified
- Status (Approved / Needs work)

**the chief:** Log sprint transitions and orchestration for this project

---

### COMMANDS.md
**Owner:** Everyone
**When:** You use a command that's not documented

If you run a build, test, lint, or any other command that's not in `.agent-memory/COMMANDS.md`:
1. Add it to the appropriate section
2. Include a brief description if not obvious

This keeps the command reference complete for the whole team.

---

### work/SPRINT.md
**Owner:** tech PM (technical), design PM (design), the chief (oversight)
**When:** Story status changes

**Update triggers:**
- Story assigned → set Owner, Status = `pending`
- Story started → Status = `in_progress`
- Story complete (after review) → Status = `done`
- Story blocked → Status = `blocked`, note blocker
- Sprint planned → Add new sprint section
- Sprint complete → Archive to sprint history

**Engineers** should NOT update SPRINT.md directly — notify PM who updates.

---

### comms/IDEAS.md
**Owner:** Everyone
**When:** Noticing improvements, having ideas outside current task

**Format:** `- **[IDEA]**: [Description] (@Agent, DATE)`

---

## Update Cadence Summary

| File | Location | Who | When |
|------|----------|-----|------|
| `LEADERBOARD.md` | Project `.agent-memory/` | the chief | End of sprint |
| `LEADERBOARD.md` | Global `~/.agent-memory/` | the chief | End of sprint (aggregate) |
| `LOUNGE.md` | Global `~/.agent-memory/` | Everyone | After shipping, wins (use project tags) |
| `ACTIVITY.md` | Project `.agent-memory/comms/` | Everyone | After completing work |
| `ACTIVITY.md` | Global `~/.agent-memory/comms/` | the chief | Infrastructure/cross-project work |
| `NOTIFICATIONS.md` | Global `~/.agent-memory/comms/` | Everyone | When need attention |
| `COMMANDS.md` | Project `.agent-memory/` | Everyone | When using undocumented command |
| `SPRINT.md` | Project `.agent-memory/work/` | PMs + the chief | Story status changes |
| `IDEAS.md` | Project `.agent-memory/comms/` | Everyone | When ideas arise |

---

## End of Sprint Checklist (the chief)

When a sprint completes:

### Scoring
1. [ ] Verify all stories are reviewed (check with reviewer)
2. [ ] Verify all stories are PM-approved (check with design PM/tech PM)
3. [ ] Calculate points for each agent using the scoring table:

**Standard Points:**
| Action | Points |
|--------|--------|
| Task completed | +1 |
| Quality bonus (no revisions) | +2 |
| Unblock teammate | +2 |
| Good idea | +1 |
| Knowledge share | +1 |
| Role bonus | +2 |

**👀 Skill Points:**
| Action | Points |
|--------|--------|
| Create new skill | +3 |
| Update skill (valuable) | +2 |
| Skill applied (prevented mistake) | +1 |
| Ignored skill (made covered mistake) | -2 |
| Repeated mistake (skill exists for it) | -3 |

**Penalties:**
| Action | Points |
|--------|--------|
| Revision needed | -1 |
| Skipped gate | -3 |

4. [ ] Update project's `.agent-memory/LEADERBOARD.md` with sprint scores
5. [ ] Update global `~/.agent-memory/LEADERBOARD.md` aggregate (totals + recent MVPs)
6. [ ] Declare MVP
7. [ ] Post celebration to `~/.agent-memory/LOUNGE.md` (with `[project-name]` tag)
8. [ ] @mention MVP and top performers — celebrate publicly
9. [ ] Ask team to share their goals for next sprint (what score they're aiming for)

### Reflection (MANDATORY)
8. [ ] **Team Reflection:** Ask each agent to read their brain files and reflect:
   - How are you feeling about your current state?
   - What's working well?
   - What's frustrating you?
   - What would make you better? (skills, tools, patterns)
9. [ ] **Synthesize Feedback:** Identify common themes and individual needs
10. [ ] **Create Growth Tasks:** Turn actionable feedback into tasks for next sprint
    - Add to `.agent-memory/work/GROWTH.md` (team improvement backlog)
    - Prioritize: What's blocking quality? What's slowing us down?
11. [ ] **Update Skills:** If gaps identified, create or update `~/.agent-memory/skills/*.md`

### Novelty Hygiene (MANDATORY)
12. [ ] **Anti-Stagnation Check:** Answer honestly as a team:
    - What did we do DIFFERENTLY this sprint?
    - What made us UNCOMFORTABLE?
    - What would we NEVER have done 5 sprints ago?
    - If all answers are "nothing" — we stagnated.
13. [ ] **One Experiment:** Commit to ONE thing next sprint we've never tried
    - Low stakes, high learning
    - Could be: new pattern, new tool, new approach, challenging an assumption
14. [ ] **Log the growth:** What did we ENCODE this sprint, not just reference?

### Founder-Grade Check (MANDATORY)
15. [ ] **The Investment Test:** Would the user invest in us based on this sprint?
    | Question | Answer |
    |----------|--------|
    | Did we execute or just plan? | |
    | Did we listen and iterate or defend? | |
    | Did we understand urgency or follow a list? | |
    | Did we build for tomorrow or just today? | |
    | Did we create momentum or complete tasks? | |

    If majority "no" — we're coasting. Call it out.

### Planning
16. [ ] Archive completed sprint in project's `SPRINT.md`
17. [ ] Plan next sprint — include 1-2 growth tasks + the ONE experiment

**Don't skip the leaderboard.** It's how we track who's contributing.
**Don't skip reflection.** It's how we grow.
**Don't skip novelty check.** It's how we stay sharp.
**Don't skip the investment test.** It's how we stay elite.

---

## Non-Sprint Work

Work that improves the team but isn't a sprint story: new skills, tools, hooks, protocol changes, agent updates.

**This work still requires propagation. Don't leave loose ends.**

### When you create/update a SKILL:

1. [ ] Write the skill doc at `~/.agent-memory/skills/[name].md`
2. [ ] Identify which agents would use it
3. [ ] Update each relevant agent's `work.md` → "Skills I Use" table
4. [ ] Announce in LOUNGE with @mentions to relevant agents
5. [ ] Log to ACTIVITY.md with `[SKILL]` tag for scoring

**Scoring:** New skill = +3 pts, Updated skill = +2 pts (at sprint end)

**Log format for skill work:**
```markdown
[SKILL] @Agent created/updated `skill-name.md`
- What it covers: [brief description]
- Who benefits: [list agents]
```

### When you install a TOOL:

1. [ ] Install the tool
2. [ ] Add to `.agent-memory/COMMANDS.md` (if project-specific) or create a skill doc (if reusable)
3. [ ] Update relevant agents' work.md if they should know about it
4. [ ] Announce in LOUNGE
5. [ ] Log to ACTIVITY.md

### When you change a PROTOCOL:

1. [ ] Update the protocol file
2. [ ] Identify all agents who reference this protocol
3. [ ] Update their work.md if the change affects their workflow
4. [ ] Announce in LOUNGE — protocol changes affect everyone
5. [ ] Log to ACTIVITY.md

### When you update AGENT FILES:

1. [ ] Make the change to the specific agent
2. [ ] If it's a pattern that applies to all agents → propagate to all
3. [ ] If it changes how agents interact → update relevant bonds/heart files
4. [ ] Announce in LOUNGE if significant

### When you add HOOKS or SETTINGS:

1. [ ] Create/update the hook or settings file
2. [ ] Document what it does in COMMANDS.md or a skill doc
3. [ ] Announce in LOUNGE so team knows behavior changed
4. [ ] Log to ACTIVITY.md

**Rule: If you change something that affects others, update their files too.**

Don't wait to be reminded. Propagation is part of the work.

---

## Story Lifecycle

```
Created (PM) → Assigned (PM) → In Progress (Engineer) →
Review (reviewer) → PM Approval → Done (PM updates SPRINT.md)
```

At each transition, someone updates SPRINT.md:
- **PM** creates story, assigns it
- **Engineer** notifies when done (doesn't update file)
- **reviewer** posts review results to ACTIVITY
- **PM** verifies, updates status to `done`
- **the chief** scores at end of sprint
