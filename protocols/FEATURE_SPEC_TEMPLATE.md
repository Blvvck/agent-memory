# [Feature Name] — Spec

<!--
NAMING: Save as features/[prefix]-[feature-name]/spec/SPEC.md

Prefixes:
  fe-     Frontend-led (@design-pm + @frontend)
  be-     Backend-led (@tech-pm + @backend)
  qa-     QA/Security (@reviewer)
  full-   Cross-cutting (@chief coordinates)

Folder structure:
  features/[prefix]-[feature-name]/
  ├── spec/SPEC.md
  ├── epics/[prefix]-[epic-name].md
  └── stories/[prefix]-[story-name].md
-->

## Meta

| Field | Value |
|-------|-------|
| Domain | `fe` / `be` / `qa` / `full` |
| Status | `draft` / `review` / `approved` / `in_progress` / `complete` |
| Owner | @design-pm+@frontend (fe) / @tech-pm+@backend (be) / @reviewer (qa) / @chief (full) |
| Target Sprint | S[XX] |
| Created | [DATE] |
| Last Updated | [DATE] by @[Agent] |

---

## Overview

**What:** [One sentence — what are we building?]

**Why:** [One sentence — why does this matter to users?]

**Success:** [How do we know it worked?]

---

## Backend (tech PM + backend dev)

_Owner: @tech-pm (spec), @backend (implementation)_
_Update this section directly as you explore. No separate files._

### Data Contracts

```typescript
// Schema, types, API shapes
```

### API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/... | Yes | ... |

### Edge Cases

| Scenario | How We Handle |
|----------|---------------|
| ... | ... |

### Implementation Notes

- Dependencies:
- Gotchas:
- Decisions made:

---

## Frontend (design PM + frontend dev)

_Owner: @design-pm (spec), @frontend (implementation)_
_Update this section directly as you explore. No separate files._

### UX Flows

```
[State] → [Action] → [State]
```

### Components

| Component | Props | Notes |
|-----------|-------|-------|
| ... | ... | ... |

### Copy & Microcopy

| Context | Copy |
|---------|------|
| Empty state | "..." |
| Error | "..." |
| Success | "..." |

### Implementation Notes

- Dependencies:
- Gotchas:
- Decisions made:

---

## QA/Security (reviewer)

_Owner: @reviewer (QA/Security Engineer)_
_Update this section directly as you explore. No separate files._

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| ... | ... |

### Test Strategy

| Type | Coverage |
|------|----------|
| Unit tests | ... |
| Integration tests | ... |
| E2E tests | ... |
| Security tests | ... |

### Edge Cases (Security/QA)

| Scenario | How We Handle |
|----------|---------------|
| ... | ... |

### Implementation Notes

- Security dependencies:
- Testing tools:
- Decisions made:

---

## Design Reference

See [frontend-design-system.md](~/.agent-memory/skills/frontend-design-system.md) for tokens, spacing, components.

**New patterns from this feature:**
- [ ] [Pattern to extract to skills/ after ship]

---

## Epics

_Created by: @chief or @PM_

### E[XX]1: [Epic Name]
**Goal:** [One sentence — what user value does this deliver?]
**Owner:** @[PM]
**Stories:** S1, S2, S3

### E[XX]2: [Epic Name]
**Goal:** ...
**Owner:** ...
**Stories:** ...

---

## Stories

_Created by: @PM (or @Engineer with PM review)_

### S1: [Story Title]
**Epic:** E[XX]1
**Owner:** @[Engineer]
**Estimate:** [X]h

**As a** [user type], **I want** [action] **so that** [benefit].

**Acceptance Criteria:**
- [ ] ...
- [ ] ...

---

### S2: [Story Title]
...

---

## Reviews

### QA/Security Review (@reviewer — QA/Security Engineer)
_Status: pending / approved / changes requested_

**Security Findings:**
- ...

**QA Findings:**
- ...

**Sign-off:** [ ] Approved by @reviewer on [DATE]

### Design Review (@design-pm)
_Status: pending / approved / changes requested_

**Findings:**
- ...

**Sign-off:** [ ] Approved by @design-pm on [DATE]

### Technical Review (@tech-pm)
_Status: pending / approved / changes requested_

**Findings:**
- ...

**Sign-off:** [ ] Approved by @tech-pm on [DATE]

---

## Open Questions

- [ ] [Question — @who to answer]
- [ ] ...

---

## Changelog

| Date | Who | What Changed |
|------|-----|--------------|
| [DATE] | @[Agent] | Created spec |
| ... | ... | ... |
