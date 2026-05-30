# Planning Protocol

> From idea to shipped code. The complete flow.

---

## Hierarchy

```
IDEA → FEATURE (Spec) → EPIC → STORY → TASK
```

| Level | What It Is | Size | Owner | Lives In |
|-------|------------|------|-------|----------|
| **Idea** | Raw thought, problem, opportunity | 1 sentence | Anyone | `.agent-memory/comms/IDEAS.md` |
| **Feature** | Full spec with backend + frontend sections | Days-weeks | PM | `.agent-memory/work/features/[name]/SPEC.md` |
| **Epic** | Chunk of user value, multiple stories | 1-3 sprints | the chief or PM | Inside SPEC.md |
| **Story** | Single deliverable, user-facing | 1-5 days | PM (or Engineer w/ review) | Inside SPEC.md → SPRINT.md |
| **Task** | Technical work, internal | Hours | Engineer | TaskList tool |

### Quick Definitions

| Level | Template | Example |
|-------|----------|---------|
| **Epic** | "Users can [capability]" | "Users can create and manage alert rules" |
| **Story** | "As a [user], I can [action] so that [benefit]" | "As a user, I can create a threshold alert" |
| **Task** | "Implement/Add/Create [technical thing]" | "Add POST /api/alerts/rules endpoint" |

---

## File Structure

```
.agent-memory/work/
├── ROADMAP.md                    # Milestones + feature list (the chief)
├── SPRINT.md                     # Current sprint stories only (PMs)
├── DESIGN_SYSTEM.md              # Project-specific design reference
│
├── features/
│   └── [prefix]-[feature-name]/
│       ├── spec/
│       │   └── SPEC.md           # THE source of truth
│       ├── epics/
│       │   └── [prefix]-[epic-name].md
│       └── stories/
│           └── [prefix]-[story-name].md
│
└── archive/                      # Completed features (move after ship)

~/.agent-memory/skills/
└── frontend-design-system.md     # Evergreen design reference (global)
```

**Folder structure per feature:**
- `spec/` — Contains SPEC.md (exploration happens here)
- `epics/` — Epic files derived from spec
- `stories/` — Story files derived from epics

**Naming convention:**
- Feature folder: `[prefix]-[feature-name]/`
- Epic files: `[prefix]-[epic-name].md`
- Story files: `[prefix]-[story-name].md`
- SPEC.md stays as just `SPEC.md` (folder provides context)

---

## Feature Naming Convention

**Prefix indicates domain ownership:**

| Prefix | Domain | Owner | Example |
|--------|--------|-------|---------|
| `fe-` | Frontend-led | @design-pm + @frontend | `fe-dashboard/` |
| `be-` | Backend-led | @tech-pm + @backend | `be-alert-rules/` |
| `qa-` | QA/Security/Testing | @reviewer | `qa-security-audit/` |
| `full-` | Cross-cutting (feature level) | @chief coordinates | `full-auth-system/` |

**Rules:**
1. Prefix tells you WHO owns the work
2. `fe-` features: Frontend-led, Backend supports
3. `be-` features: Backend-led, Frontend consumes
4. `qa-` features: Testing/security focused, reviewer owns
5. `full-` features: Cross-cutting, contains mixed `fe-`/`be-`/`qa-` epics and stories

**Consistent prefixes at every level:**
- Feature folder: `[prefix]-[feature-name]/`
- Epics inside: `[prefix]-[epic-name].md`
- Stories inside: `[prefix]-[story-name].md`

**Examples:**

Single-domain feature:
```
features/fe-dashboard/
├── spec/SPEC.md
├── epics/
│   ├── fe-stat-cards.md
│   └── fe-charts.md
└── stories/
    ├── fe-visibility-score-ring.md
    └── fe-trend-indicator.md
```

Cross-cutting feature (mixed prefixes inside):
```
features/full-auth-system/
├── spec/SPEC.md
├── epics/
│   ├── fe-login-ui.md
│   ├── be-auth-api.md
│   └── qa-auth-security.md
└── stories/
    ├── fe-login-form.md
    ├── be-jwt-tokens.md
    └── qa-csrf-testing.md
```

---

## The Flow

### 1. IDEA → Capture

**Who:** Anyone
**Where:** `.agent-memory/comms/IDEAS.md`
**When:** Immediately when idea occurs

```markdown
- [DATE] @the user: What if we added dark mode?
- [DATE] @backend: Queue system could batch by platform
```

**Rule:** Capture everything. Filter at sprint planning.

---

### 2. IDEA → FEATURE SPEC

**Who:** PM creates (design PM = frontend-led, tech PM = backend-led, the chief = cross-cutting)
**Where:** `.agent-memory/work/features/[feature-name]/SPEC.md`
**When:** Before any work starts

**Process:**
1. PM creates SPEC.md from `~/.agent-memory/protocols/FEATURE_SPEC_TEMPLATE.md`
2. PM fills Overview + their domain section
3. Other agents fill their sections directly (no separate files)
4. @chief reviews structure, @the user approves
5. Ready for epic/story breakdown

---

### 3. SPEC EXPLORATION (No Separate Files)

**Key principle: Everyone updates the SAME file in their section.**

| Section | Owner | When They Update |
|---------|-------|------------------|
| Meta | the chief | Create, status changes |
| Overview | Owning PM | Initial creation |
| Backend | @tech-pm + @backend | As they explore |
| Frontend | @design-pm + @frontend | As they explore |
| Design Reference | Anyone | When patterns emerge |
| Reviews | @reviewer, @design-pm, @tech-pm | When reviewing |
| Open Questions | Anyone | Anytime |

**No batch consolidation.** The spec is always current because everyone updates it directly.

---

### 4. EPIC BREAKDOWN

**Who:** the chief OR PM (whoever has capacity)
**Where:** Epics section of SPEC.md
**When:** After exploration sections are filled

**Process:**
1. Identify logical chunks of user value
2. Each epic gets: ID, goal (one sentence), owner, story list
3. Sequence by dependencies

**Format:**
```markdown
### E101: Alert Rules Engine
**Goal:** Users can create rules that trigger alerts
**Owner:** @tech-pm
**Stories:** S1, S2, S3
```

---

### 5. STORY BREAKDOWN

**Who:** PM (or Engineer with PM review)
**Where:** Stories section of SPEC.md
**When:** During or before sprint planning

**Process:**
1. Write story with user perspective + acceptance criteria
2. Engineer estimates
3. Dependencies identified

**Format:**
```markdown
### S1: Create alert rule API
**Epic:** E101
**Owner:** @backend
**Estimate:** 4h

**As a** user, **I want** to create alert rules via API **so that** I can automate monitoring.

**Acceptance Criteria:**
- [ ] POST /api/alerts/rules creates a rule
- [ ] Validation rejects invalid configs
- [ ] Returns rule ID on success
```

---

### 6. SPRINT PLANNING

**Who:** the chief + PMs
**Where:** Copy stories from SPEC.md → SPRINT.md
**When:** Start of sprint

**SPRINT.md format (lean):**
```markdown
## Sprint 12

### Backend
| Story | Spec | Owner | Status |
|-------|------|-------|--------|
| S1: Alert rules API | [→](features/alerts/SPEC.md#s1) | @backend | pending |

### Frontend
| Story | Spec | Owner | Status |
|-------|------|-------|--------|
| S2: Alert rules UI | [→](features/alerts/SPEC.md#s2) | @frontend | pending |
```

**Engineers click the link for full context.** SPRINT.md stays lean.

---

### 7. EXECUTION

**Who:** Engineers
**Where:** SPRINT.md (status), TaskList (tasks), SPEC.md (reference)

**Process:**
1. Engineer picks story from SPRINT.md
2. Reads full context in SPEC.md
3. Creates tasks using TaskList tool
4. Updates SPRINT.md status as they work
5. Submits for review

---

### 8. REVIEW + SHIP

**Who:** reviewer (code), PM (acceptance), the user (final)
**Where:** Reviews section of SPEC.md

**Process:**
1. Engineer marks story complete in SPRINT.md
2. @reviewer reviews code quality/security
3. PM verifies acceptance criteria
4. Sign-offs recorded in SPEC.md Reviews section
5. Story marked done

---

### 9. CLOSE FEATURE

**Who:** the chief
**When:** All stories shipped

**Process:**
1. Update SPEC.md status to `complete`
2. Extract evergreen patterns to `~/.agent-memory/skills/`
3. Move feature folder to `.agent-memory/work/archive/`
4. Update ROADMAP.md

---

## Who Creates What

| Item | Primary Owner | Can Also Do |
|------|---------------|-------------|
| Feature SPEC | PM (design PM/tech PM) or reviewer (qa-) | the chief |
| Epics | the chief | PMs, reviewer |
| Stories | PMs, reviewer | Engineers (with PM review) |
| Tasks | Engineers | — |
| Reviews | reviewer (QA/Security), design PM, tech PM | — |

**Team Pairs:**
| Pair | Members | Domain |
|------|---------|--------|
| Frontend | @design-pm + @frontend | `fe-` features |
| Backend | @tech-pm + @backend | `be-` features |
| QA/Security | @reviewer | `qa-` features, cross-cutting reviews |
| Coordination | @chief | `full-` features |

**Rule:** Whoever has capacity and context. No bottlenecks.

---

## Status Flow

```
Feature:  draft → review → approved → in_progress → complete
Epic:     planned → in_progress → complete
Story:    backlog → sprint → in_progress → review → complete
Task:     pending → in_progress → completed
```

---

## Templates

- **Feature Spec:** `~/.agent-memory/protocols/FEATURE_SPEC_TEMPLATE.md`
- **Design Reference:** `~/.agent-memory/skills/frontend-design-system.md`

---

## Checkpoints

| Checkpoint | Who Approves | What's Checked |
|------------|--------------|----------------|
| Idea → Feature | the user | Worth building? |
| Spec complete | the chief + the user | All sections filled? Clear? |
| Stories ready | PM | Acceptance criteria? Estimates? |
| Story complete | reviewer + PM | Criteria met? Code quality? |
| Feature complete | the user | User value delivered? |

---

## Concurrent Pair Work

**All pairs work concurrently on their domains:**

### Phase 1: Sort Old Work
- Review existing epics/stories in your domain
- Understand what was planned vs shipped
- Identify what's still relevant vs stale

### Phase 2: Map to Features
- Read source material thoroughly (all relevant sections)
- Create feature folders: `/features/[prefix]-[feature-name]/`
- Move relevant old epics/stories into feature folders
- Identify gaps where context exists but no epic/story

### Phase 3: Plan New Sprints
- Create SPEC.md for each feature
- Break down into epics (with prefix)
- Break epics into stories (with prefix)
- Flag cross-cutting dependencies for coordination

### Thoroughness Checklist

Before marking any feature complete:

- [ ] Read ALL relevant sections of source material
- [ ] Cross-reference with existing epics/stories
- [ ] Check P0 critical items that touch this feature
- [ ] Check edge cases (security, data integrity, UX)
- [ ] Verify TypeScript interfaces exist in spec
- [ ] Verify UX flows documented
- [ ] Verify acceptance criteria on every story
- [ ] Flag dependencies on other features
- [ ] Update ROADMAP.md

---

## Integration Wiring (MANDATORY)

**Every sprint must define how its stories connect to the running application.**

Dead code from sprint work happens when stories are built in isolation and nobody verifies
they're wired together. Sprint 4 (F9) shipped 17 stories but had unwired components, missing
prop passing, and imports that nothing consumed — caught only in post-merge review.

### At Planning Time (PM)

When writing stories for SPRINT.md, include an **integration check** section at the bottom:

```markdown
**Sprint N integration check:**
- [ ] <end-to-end flow 1>: <component A> → <component B> → <component C> → visible result
- [ ] <end-to-end flow 2>: ...
- [ ] All wiring confirmed: <list every new file and where it's imported/used>
- [ ] No dead code: every new file is imported and used by at least one integration point
```

### What to Check

For EVERY new file or export created in the sprint:

| Question | If "no" → it's dead code |
|----------|--------------------------|
| Is it imported by another file? | Must be `import`ed somewhere |
| Is the import actually used (not just type-only)? | Must be called/rendered/instantiated |
| Does the call chain reach the app entry point? | Must trace back to `App.tsx` / `index.ts` / main |
| Are props/config actually passed at the integration site? | Not just typed — actually wired |

### Dependency Map (Required for Multi-Story Sprints)

When a sprint has > 5 stories, SPRINT.md must include a **dependency/wiring map**:

```markdown
**Critical Path:**
S300 → S301 → S304 → S305 (types → spawner → handler → tools)
              |
            S306 → S328 (tree → messaging)

**Wiring points (where code connects):**
- App.tsx: creates SubAgentSpawner (S301), passes to ConversationZone (S306)
- createDefaultRegistry(): registers agent tools (S305, S310, S311)
- ConversationZone: receives agents prop, renders AgentTree (S306)
```

This makes it explicit WHERE stories must connect. Without it, engineers build in
isolation and PM discovers gaps at merge time.

### At Close Time (PM)

Every integration check item must pass before marking sprint CLOSED.
See `~/.agent-memory/protocols/SPRINT.md` Phase 4 (Close) checklist.

---

## Anti-Patterns

**Don't:**
- Create separate exploration files (update SPEC.md directly)
- Batch consolidation at the end (stay current as you go)
- Skip the Reviews section (sign-offs matter)
- Let SPRINT.md get bloated (only current sprint)
- Ship stories without verifying they're wired to the app
- Assume "it compiles" means "it's connected"

**Do:**
- Update your section of SPEC.md immediately
- Reference SPEC.md from SPRINT.md (don't duplicate)
- Extract patterns to skills/ after shipping
- Archive completed features
- Map wiring points at planning time, verify at close time

---

## Quick Reference

```
the user: "Build X"
    ↓
PM creates: features/x/SPEC.md (from template)
    ↓
Team fills sections: Backend, Frontend, Reviews (same file)
    ↓
the chief/PM breaks into: Epics + Stories (same file)
    ↓
Sprint planning: Stories → SPRINT.md (links back to spec)
    ↓
Engineer executes: Tasks (TaskList), references SPEC.md
    ↓
Review: reviewer + PM sign off in SPEC.md
    ↓
Ship: Archive spec, extract patterns to skills/
```
