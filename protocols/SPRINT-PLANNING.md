# Sprint Planning Protocol

**Purpose:** Ensure sprint plans are complete, accurate, and executable. Avoid the mistakes caught during F12 planning.

---

## Pre-Planning Checklist

Before writing any stories:

- [ ] **Read the FULL spec** — not just headers, not just "relevant sections." Every section. Every appendix reference.
- [ ] **Count deliverables** — if spec says "371 adapters," your plan must account for 371 adapters. Reconcile numbers.
- [ ] **Identify existing code** — grep codebase for related patterns. Know what exists vs what's new.
- [ ] **Map dependencies** — what must exist before what? Draw the graph.

---

## Story Writing Rules

### ACs Must Be Verification-Focused

**Wrong (checkbox/implementation):**
```
✓ Add `slug` column to `saas_application`
✓ `normalizeAppName(input)` trims whitespace
✓ Shared `handleRateLimit(response)` utility in `shared/`
```

**Right (observable behavior):**
```
**Verify:** `SELECT slug FROM saas_application LIMIT 1` succeeds after migration
**Verify:** SDK event with `app_name: " Azure "` matches existing "Azure" app (no new app created)
**Verify:** Adapter receiving 429 with `Retry-After: 5` waits ~5s then retries (observable in logs)
```

**The test:** Can someone verify this AC by observing the running system? If not, rewrite it.

### Every Story Must Answer

1. **What changes?** — files, DB, endpoints affected
2. **How do we verify?** — specific query, API call, or observation
3. **What breaks if missing?** — downstream dependencies
4. **Who owns it?** — single owner, not "team"

### No Orphan Work

Every piece of code must be:
- Registered in module system
- Called by at least one consumer
- Reachable from production entry points

If your story creates a utility, another story must USE that utility. Otherwise it's dead code.

---

### Extract Till You Drop

Keep decomposing until each story is trivial.

If the ACs have "and" — split it. If the estimate is >5 points — it's probably two stories. If you can say "X depends on Y, unless Z" — split at the branch.

Why: A trivial story is trivial to review, trivial to test, and nearly impossible to get wrong. Ambiguity hides in the gap between "small enough" and "actually small."

---

## Common Mistakes (From F12 Review)

### 1. Reading Only Part of the Spec
**Symptom:** Reviewers ask "what about the 300 adapters in section 4?"
**Fix:** Read entire spec. Create checklist of all deliverables. Cross-reference with plan.

### 2. Checkbox ACs
**Symptom:** "✓ Add X" instead of "Verify X works"
**Fix:** Every AC starts with "**Verify:**" and describes observable outcome.

### 3. Duplicate Work Across Epics
**Symptom:** Same adapter in E34 and E42. Same certification in E44 and E56.
**Fix:** After writing plan, grep for duplicates. Each deliverable appears exactly once.

### 4. Sprint Overloading
**Symptom:** Sprint 6 has AWS + Azure + GCP + 9 more adapters = 48 points
**Fix:** Complex items (cloud providers, multi-signal adapters) get isolated sprints. Max 35 points for risky work.

### 5. Missing Infrastructure Stories
**Symptom:** E1-S3 depends on `source` column, but no story creates it
**Fix:** For every "depends on X," verify X is explicitly planned. Add E0-S6 if missing.

### 6. Security ACs Missing on Public Endpoints
**Symptom:** Public credential submission endpoint has no rate limits, no audit logging
**Fix:** Any public endpoint needs: rate limits, audit logging, input validation, timing-safe comparisons

### 7. No Test Strategy
**Symptom:** "Unit + integration tests" per adapter but no coverage requirements, no CI integration
**Fix:** Add shared test harness story. Define coverage bar. Wire to CI.

### 8. Epic Number Confusion
**Symptom:** Spec uses E37-E43, plan uses E60-E66. Reviewers confused.
**Fix:** Add epic mapping table at top of plan.

### 9. Pre-work Not Specified
**Symptom:** Adapter built from memory of provider docs, not from audited spec appendix
**Fix:** Every adapter sprint: "Pre-work: Read spec Appendix [X], use corrected values from audit"

### 10. Dependencies Not in Sprint
**Symptom:** Sprint 1 says E0-S1 to E0-S5, but E0-S6 needed by Sprint 1's E1-S3
**Fix:** After writing sprints, verify all dependencies are in same or earlier sprint.

### 11. Frontend Timing Wrong
**Symptom:** Credential UI ships in Sprint 37, but credential share links need consumer NOW
**Fix:** Split early/late: E6-early (minimal UI, ships Sprint 3) vs E6-late (full UI, ships last)

### 12. No Codebase Context
**Symptom:** Plan says "add adapter" but doesn't say where adapters live
**Fix:** Add "Codebase Context" section: file paths, reference implementations, interface contracts

### 13. Risk Register Incomplete
**Symptom:** Plan ignores enterprise auth complexity, API accessibility surprises
**Fix:** Add risks: ops queue overflow, enterprise-only APIs, gated providers, ERP complexity

### 14. Lazy Fallbacks in ACs
**Symptom:** "Graceful degradation" that silently swallows errors
**Fix:** Failures must be explicit: status codes, NeedsAttention entries, admin notifications

### 15. Stale Dependencies
**Symptom:** Story uses `discoverCapabilities` but that method doesn't exist yet
**Fix:** Dependency must be COMPLETE (not "in progress") before dependent story starts

---

## Definition of Done (Apply to ALL Stories)

Every story must pass ALL of these:

### 1. Fully Wired
- Code registered in module system
- Reachable from production entry points
- Not orphaned

### 2. End-to-End Verified
- Works in running system, not just unit tests
- Real credentials → real API → real data in DB

### 3. No Lazy Fallbacks
- Errors are explicit, not swallowed
- Failures surface to admin (logs, alerts, NeedsAttention)

### 4. No Checkbox ACs
- ACs describe behavior, not implementation
- Verifiable by observing running system

### 5. No Stale Dependencies
- Prerequisites actually complete
- Not "mostly done" or "will be done by Sprint X"

### 6. Review Gate
- reviewer reviews for quality/security
- PM verifies feature intent
- Both signoffs before close

---

## Sprint Structure Template

```markdown
### Sprint N: [Name]
**Duration:** X weeks
**Goal:** [One sentence — what's different after this sprint]

| Epic | Stories | Owner | Points |
|------|---------|-------|--------|
| EX | EX-S1 to EX-SN | @Name | N |

**Total:** N points
**Reviewer:** @reviewer

**Pre-work:** [What to read before starting]
**Risks:** [What could block this sprint]
**Exit bar:** [How we know it's done — observable outcome]
```

---

## Review Checklist (Before Sharing Plan)

- [ ] Every spec deliverable accounted for
- [ ] No duplicate work across epics
- [ ] All dependencies satisfied within sprint timing
- [ ] ACs are verification-focused (start with "**Verify:**")
- [ ] Public endpoints have security ACs
- [ ] Test strategy defined
- [ ] Codebase context included
- [ ] Risk register covers ops/enterprise/API risks
- [ ] Epic mapping table if using different numbers than spec
- [ ] Sprint points < 40 for risky/complex work
- [ ] Frontend timing considers early vs late needs

---

## Who Reviews Plans

1. **@backend** — Codebase accuracy, interface contracts, implementation feasibility
2. **@chief** — Architectural gaps, missing infrastructure, adversarial edge cases
3. **@reviewer** — QA/security gaps, test coverage, AC quality

All three before the user approval.
