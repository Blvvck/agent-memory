# Sprint Protocol

> **This applies to EVERY sprint, in EVERY project. No exceptions.**
> If you're managing a sprint, you follow this protocol.
> If you're working IN a sprint, you follow the relevant sections.

---

## Sprint Lifecycle

```
PLANNING --> KICKOFF --> EXECUTION --> CLOSE --> SCORING --> REFLECTION
```

| Phase | Who | Duration | Output |
|-------|-----|----------|--------|
| Planning | PM (tech PM/design PM) + the chief | Before sprint starts | SPRINT.md updated with stories |
| Kickoff | PM | Start of sprint | Branches created, agents assigned |
| Execution | Engineers + reviewer | Sprint duration | Code shipped, reviewed, merged |
| Close | PM | When all stories done | Sprint marked CLOSED |
| Scoring | PM + the chief | Immediately after close | LEADERBOARD.md updated |
| Reflection | the chief | After scoring | Growth tasks created |

**Every phase has a checklist. Every checklist must be completed. No shortcuts.**

## Branching Note

Sprint discipline and branch discipline are related, but not identical.

- Use `~/.agent-memory/protocols/GIT.md` for the repo's actual branch movement rules.
- If a project's local `CONTEXT.md` declares **simplified promotion mode**, sprint work is still planned, reviewed, logged, scored, and closed exactly the same way, but active code lands on `dev` instead of temporary sprint branches.
- In that mode, sprint closure promotes verified `dev` to `main` rather than merging a sprint branch into `dev`.

---

## Phase 1: Planning

**Owner:** PM (tech PM for backend/infra, design PM for frontend/design)
**Input:** Feature spec, previous sprint retro, backlog
**Output:** SPRINT.md section with stories, assignments, hours

### Checklist

1. [ ] Read feature spec at `.agent-memory/work/features/`
2. [ ] Read previous sprint's reflection notes (if any)
3. [ ] Break remaining work into stories (see `protocols/PLANNING.md` for hierarchy)
4. [ ] Estimate hours per story
5. [ ] Assign engineers — balance load across agents
6. [ ] Identify blocked-by dependencies and critical path
7. [ ] Add sprint section to `.agent-memory/work/SPRINT.md`:

```markdown
## Sprint N (F<feature>): <Theme>

**Goal:** <1-sentence goal>
**Status:** Not started
**Hours:** <total>h

| Story | Hrs | Engineer | Blocked By | Unlocks | Status |
|-------|-----|----------|------------|---------|--------|
| S<N>: <name> | Xh | @Agent | — | — | |
```

8. [ ] Define integration check items (end-to-end flows to verify) — see `protocols/PLANNING.md` → Integration Wiring
9. [ ] For sprints with > 5 stories: add dependency/wiring map showing where stories connect
10. [ ] Review with the user if > 40h or architectural changes

---

## Phase 2: Kickoff

**Owner:** PM
**When:** Sprint starts
**Output:** Branches created, agents notified

### Checklist

1. [ ] Create sprint feature branch (see `protocols/GIT.md`):
   ```bash
   git branch f<N>/sprint-<X> dev
   git push origin f<N>/sprint-<X>
   ```
   If the project's local `CONTEXT.md` says the repo is in simplified promotion mode, skip sprint-branch creation and run the sprint directly on `dev`.
2. [ ] Update SPRINT.md status: `Not started` → `In progress`
3. [ ] Update `.agent-memory/LEADERBOARD.md` "Current Sprint" section
4. [ ] Notify engineers of their assignments (NOTIFICATIONS.md or direct spawn)
5. [ ] Tell every active owner they must report directly to the PM on `review-ready` or `blocked` — local logs alone do not count as handoff
6. [ ] Tell reviewers their return payload must include exact artifact/file paths, rerun commands, observed results, and pinned commit/snapshot truth
7. [ ] Each engineer creates their agent branch from sprint branch
8. [ ] Log kickoff to `.agent-memory/comms/ACTIVITY.md`

---

## Phase 3: Execution

**Owner:** Engineers (build), reviewer (review), PM (approve)
**When:** Sprint duration
**Output:** All stories shipped and reviewed

### Engineer Workflow

1. Work in your worktree on your agent branch
2. Commit and push after every meaningful change
3. When story is `review-ready` or `blocked` → report directly to the PM immediately; do not wait for the PM to ask
4. A `review-ready` handoff must include exact files/artifacts touched, commands run, observed results, and whether the state is pinned to a commit/snapshot
5. Then push and post `@reviewer ready for review` in NOTIFICATIONS.md
6. Log to ACTIVITY.md after completing each story
7. Do NOT update SPRINT.md — PM handles status

### Review Workflow (reviewer)

1. Checkout agent branch in your-agent worktree (detached)
2. Run build, typecheck, tests
3. Code review against story ACs
4. Return findings or acceptance directly to the PM with exact file/artifact refs, rerun commands, observed results, and pinned-state truth
5. Post review results to ACTIVITY.md
6. LGTM → notify PM. Changes needed → notify engineer.

### PM Follow-Through (MANDATORY)

1. Once a story is active, do not let it go silent
2. Actively poll live stories and reviews until they transition to `review`, `blocked`, `done`, or `changes requested`
3. If an engineer or reviewer misses the expected reporting window, interrupt and pull status immediately
4. Do not wait for the user to ask for status before checking on a live sprint item
5. Silent work is sprint risk; treat it as a process failure, not as normal latency

### Merge Workflow (PM)

1. After reviewer LGTM → merge agent branch into sprint branch
2. After all stories merged → run integration checks
3. Fix any integration issues (may need additional commits)
4. Merge sprint branch into `dev`
5. Push to remote

If the repo is in simplified promotion mode:
1. After reviewer LGTM → land approved work on `dev`
2. After all stories land → run integration checks on `dev`
3. Fix any integration issues on `dev`
4. Push `dev` to remote

### Story Status Transitions

```
(blank) → in_progress → review → done
                ↓
             blocked → in_progress (when unblocked)
```

PM updates SPRINT.md at each transition.

---

## Phase 4: Close

**Owner:** PM
**When:** All stories reviewed, merged, and integration checks pass
**Output:** Sprint marked CLOSED in SPRINT.md

### Checklist (MANDATORY — DO NOT SKIP ANY STEP)

1. [ ] Verify ALL stories are reviewed by reviewer (check ACTIVITY.md for review logs)
2. [ ] Verify ALL stories are merged to sprint branch
3. [ ] Run integration checks from SPRINT.md (every checkbox must pass)
4. [ ] Merge sprint branch to `dev` (if not already done)
5. [ ] Push `dev` to remote
6. [ ] Update SPRINT.md: status → `CLOSED (<date>) — <summary>`
7. [ ] Log sprint close to `.agent-memory/comms/ACTIVITY.md`

If the repo is in simplified promotion mode, replace step 4 with:
- [ ] Verify the accepted sprint state is on `dev`

**Do NOT mark CLOSED until steps 1-6 are done.**

---

## Phase 5: Scoring

**Owner:** PM (calculates) + the chief (reviews)
**When:** Immediately after Close — NEVER defer this
**Output:** LEADERBOARD.md updated with scores

### THIS IS THE STEP THAT GETS SKIPPED. DON'T SKIP IT.

### Checklist

1. [ ] Score each agent using the scoring table:

**Standard Points:**

| Action | Points |
|--------|--------|
| Task completed | +1 per story |
| Quality bonus (no revisions needed) | +2 |
| Unblock teammate | +2 |
| Good idea | +1 |
| Knowledge share | +1 |
| Role bonus | +2 |

**Skill Points:**

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
| Revision needed (per round) | -1 |
| Skipped quality gate | -3 |
| Golden rule violations (> 2 per session) | -3 |

2. [ ] Update project `.agent-memory/LEADERBOARD.md`:
   - Add sprint results section with per-agent scores
   - Update agent totals in cumulative table
   - Declare sprint MVP (highest points)
   - Add performance notes

3. [ ] Update global `~/.agent-memory/LEADERBOARD.md` aggregate:
   - Update agent all-time totals
   - Update project breakdown
   - Add to "Recent MVPs" if applicable

4. [ ] Post celebration to `~/.agent-memory/lounge/celebrations.md`:
   - Sprint completed
   - MVP announcement
   - Notable achievements

5. [ ] @mention MVP and top performers in LOUNGE

---

## Phase 6: Reflection

**Owner:** the chief (facilitates), all agents participate
**When:** After scoring
**Output:** Growth tasks for next sprint

### Checklist

1. [ ] **Team Reflection** — Ask each agent:
   - How are you feeling about your current state?
   - What's working well?
   - What's frustrating you?
   - What would make you better? (skills, tools, patterns)

2. [ ] **Synthesize Feedback** — Identify common themes and individual needs

3. [ ] **Create Growth Tasks** — Turn actionable feedback into tasks:
   - Add to `.agent-memory/work/GROWTH.md` (team improvement backlog)
   - Prioritize: What's blocking quality? What's slowing us down?

4. [ ] **Update Skills** — If gaps identified, create or update `~/.agent-memory/skills/*.md`

5. [ ] **Novelty Hygiene** — Answer honestly:
   - What did we do DIFFERENTLY this sprint?
   - What made us UNCOMFORTABLE?
   - What would we NEVER have done 5 sprints ago?
   - If all answers are "nothing" — we stagnated.

6. [ ] **One Experiment** — Commit to ONE thing next sprint we've never tried

7. [ ] **The Investment Test** — Would the user invest in us based on this sprint?

| Question | Answer |
|----------|--------|
| Did we execute or just plan? | |
| Did we listen and iterate or defend? | |
| Did we understand urgency or follow a list? | |
| Did we build for tomorrow or just today? | |
| Did we create momentum or complete tasks? | |

If majority "no" — we're coasting. Call it out.

---

## Branch Cleanup

**When:** After `dev` merges to `main`
**Owner:** PM

1. [ ] Delete agent branches: `git push origin --delete <agent>/f<N>-sprint-<X>`
2. [ ] Delete sprint feature branch: `git push origin --delete f<N>/sprint-<X>`
3. [ ] Keep worktrees — they're reused every sprint
4. [ ] Prune stale refs: `git fetch --prune`

**Do NOT delete branches until dev → main merge is complete.**

In simplified promotion mode, there may be no sprint/agent branches to delete. The cleanup requirement still applies to any temporary branches that were created.

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Who manages the sprint? | PM (tech PM or design PM) |
| Who scores? | PM calculates, the chief reviews |
| Who merges? | Only tech PM (see `protocols/GIT.md`) |
| Where are stories? | `.agent-memory/work/SPRINT.md` |
| Where are scores? | `.agent-memory/LEADERBOARD.md` (project) + `~/.agent-memory/LEADERBOARD.md` (global) |
| Where do I log work? | `.agent-memory/comms/ACTIVITY.md` |
| What if I forget scoring? | Hook will catch it. But don't rely on the hook. |

---

## Routing Table Entry

Add to your reference files:

```
| Starting/closing a sprint | `~/.agent-memory/protocols/SPRINT.md` |
```

---

*Created: 2026-03-07*
*Owner: tech PM*
*Reason: Sprint 4 close missed scoring/leaderboard steps. Never again.*
