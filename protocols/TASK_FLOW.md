# Task Flow Protocol

## Hierarchy

```
ROADMAP (high-level goals)
    └── EPIC (feature-level, owned by PM)
          └── USER STORY (customer pain → solution)
                └── TASK (atomic work, assigned to engineer)
```

---

## Epics

**Location:** `[project]/.agent-memory/work/epics/E[XXX]-[name].md`
**Created by:** DESIGN PM or TECHNICAL PM
**Format:**
```markdown
# E001: [Epic Name]

## Owner
[DESIGN PM or TECHNICAL PM]

## Goal
[What this epic achieves]

## User Value
[Why users care]

## Success Criteria
- [ ] [Measurable outcome]
- [ ] [Measurable outcome]

## Stories
- S001: [Story name]
- S002: [Story name]

## Status
[Not Started / In Progress / Complete]
```

---

## User Stories

**Location:** `[project]/.agent-memory/work/stories/S[XXX]-[name].md`
**Created by:** DESIGN PM or TECHNICAL PM
**Format:**
```markdown
# S001: [Story Name]

## Epic
E001: [Epic Name]

## User Story
As a [user type], I want to [action] so that [benefit].

## Customer Pain
[What problem this solves, evidence from research]

## Acceptance Criteria
- [ ] [Specific requirement]
- [ ] [Specific requirement]

## Tasks
Created via TaskCreate, reference this story in description.

## Status
[Not Started / In Progress / Review / Complete]
```

---

## Tasks

**Created via:** `TaskCreate` tool
**Assigned to:** Individual engineers
**Format:**
- **Subject:** Clear, actionable (e.g., "Build /api/reset-password endpoint")
- **Description:** Include story reference, acceptance criteria, context

**Status Flow:**
```
pending → in_progress → completed
```

**Rules:**
1. One owner per task
2. Update status when starting (`in_progress`)
3. Update status when done (`completed`)
4. If blocked, note in description + add to BLOCKERS.md

---

## Example Flow

1. **DESIGN PM** creates Epic: `E001-user-auth.md`
2. **DESIGN PM** creates Story: `S001-password-reset.md`
3. **TECHNICAL PM** creates Tasks:
   - "Design reset flow mockup" → assigned DESIGN PM
   - "Build /api/reset endpoint" → assigned BACKEND
   - "Build reset form UI" → assigned FRONTEND
   - "Security review reset flow" → assigned REVIEWER
4. **Engineers** pick up tasks, update status, ship
5. **REVIEWER** gates quality
6. **Story** marked complete when all tasks done
7. **Epic** marked complete when all stories done

---

## Sprint

**Location:** `[project]/.agent-memory/work/SPRINT.md`
**Purpose:** Current focus
**Format:**
```markdown
# Current Sprint

## Focus
[1-2 sentence sprint goal]

## Active Stories
- S001: [Name] - [Status] - [Owner]
- S002: [Name] - [Status] - [Owner]

## Key Dates
- [Date]: [Milestone]
```

---

## Roadmap

**Location:** `[project]/.agent-memory/work/ROADMAP.md`
**Purpose:** High-level direction
**Format:**
```markdown
# Roadmap

## Now (Current Sprint)
- E001: [Epic]

## Next (Upcoming)
- E002: [Epic]

## Later (Backlog)
- E003: [Epic]
```
