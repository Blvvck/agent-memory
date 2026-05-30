# Code Review & Handoff Protocol

> **This is mandatory.** No work is "done" until this flow completes.
> Roles are NOT hardcoded to specific agents — they're assigned per sprint.

---

## Bug Fix Protocol (Mandatory)

When the task is a bug, regression, broken behavior, or mismatch between expected and actual behavior, start here before you start patching.

```
Observe report
    ↓
Reproduce from first principles
    ↓
Create failing proof
    ↓
Reduce to the smallest useful failing surface
    ↓
Fix the actual cause
    ↓
Re-run the same proof until it passes
```

### 1. Reproduce Before You Fix

- [ ] Restate the exact observed behavior
- [ ] Identify the expected behavior
- [ ] Reproduce the failure yourself
- [ ] Check facts at the source: paths, configs, requests, data, state, logs
- [ ] Walk down the stack until you can point to the real failing surface

**Rule:** Do not patch from a galaxy-level theory. Travel down to the atom. Verify the inside directly.

### 2. Create a Failing Proof

- [ ] Prefer a failing automated test
- [ ] If a test is not the right first artifact, create one of:
  - failing fixture
  - minimal repro script
  - failing API request
  - screenshot/video of broken UI state
  - captured trace/log proving the failure
- [ ] Confirm the proof fails for the right reason

**No proof, no fix claim.**

### 3. Fix Only the Proven Failure

- [ ] Explain what actually failed
- [ ] Change the smallest correct layer first
- [ ] Avoid speculative rewrites
- [ ] If you discover the original report was wrong, update the proof and state that explicitly

### 4. Prove the Fix

- [ ] Re-run the same proof and make it pass
- [ ] Run neighboring tests/checks to catch regressions
- [ ] In your report, cite the proof you used

**Forbidden close-out language:** "I think this should work."  
**Required standard:** "Here is the failing proof, here is the passing proof."

---

## Roles (Assigned Per Sprint)

| Role | Description | Default | Can Be |
|------|-------------|---------|--------|
| **Sprint Lead** | Manages the sprint, triages findings, assigns fixes | tech PM or design PM | Any PM or the chief |
| **QA Reviewer** | Security, code quality, testing — the quality gate | reviewer | Any agent NOT on the sprint |
| **External Reviewer** | First review pass — fresh eyes, no sprint context bias | Varies | Any agent NOT on the sprint |
| **Sprint Members** | Engineers who built the code | Assigned in SPRINT.md | backend dev, frontend dev, backend dev, etc. |

**Key rule:** QA Reviewer and External Reviewer MUST NOT be sprint members.
If reviewer is coding in the sprint, someone else is QA Reviewer.

**Assign roles in SPRINT.md:**
```markdown
**Sprint Roles:**
- Sprint Lead: @tech-pm
- QA Reviewer: @reviewer
- External Reviewer: @backend
- Sprint Members: @backend, @frontend
```

---

## Story-Level Review (During Sprint)

Individual stories get reviewed as they're completed — don't wait for sprint end.

```
Engineer builds + tests → QA Reviewer reviews → Sprint Lead confirms → Merge to sprint branch
```

### 1. Engineer Completes Work

**Navigate to your worktree, work on your agent branch:**
```bash
cd ../.<project>-worktrees/<your-name>/
```

**Before posting for review (see `.agent-memory/COMMANDS.md` for exact commands):**
- [ ] All work committed to agent branch
- [ ] Run **tests** — all pass, no exceptions
- [ ] New code has test coverage (if applicable)
- [ ] Run **build command** — passes
- [ ] Run **type check command** — passes (build alone is NOT enough)
- [ ] Actually run the code (write a quick test script if needed)
- [ ] If you used a new command → add it to `.agent-memory/COMMANDS.md`

**Then post:**
- Post in NOTIFICATIONS.md: `@<QA Reviewer> ready for review: [Story ID] - [brief description]`
- Include: **branch name**, files changed, test results, any concerns
- Status stays `in_progress` (not done yet)

> **No green tests = no review request.** Engineers own their tests.

### 2. QA Reviewer Reviews

**SLA: IMMEDIATE.** When review is requested, respond NOW. Not later. Not batched. NOW.

**Don't just read code — actually test it.**

#### Build Verification (see `.agent-memory/COMMANDS.md`):
- [ ] Run **build command** — must pass
- [ ] Run **type check command** — **MANDATORY** (build passing means nothing)
- [ ] Run **tests** — must pass

#### Code Quality:
- [ ] Readability, patterns
- [ ] Security (OWASP top 10, auth, injection, XSS)
- [ ] Performance (no N+1, efficient queries)
- [ ] Tests exist and are meaningful

#### For Frontend Code:
- [ ] Start dev server, open in browser
- [ ] Click every button, test every hover, test form inputs
- [ ] Check loading/error/empty states
- [ ] Test keyboard navigation

#### For Backend Code:
- [ ] Send actual API requests (curl, test script)
- [ ] Test happy path and error cases
- [ ] Verify data persistence

#### If Something's Wrong: FIX IT YOURSELF
- Tasteless hover? Fix the CSS.
- Missing validation? Add it.
- Only kick back for major architectural changes or teaching moments.

**Outcome:**
- **LGTM** → Posts `@<Sprint Lead>` for confirmation
- **Fixed issues** → Note what you fixed, then LGTM
- **Changes needed** → Only for major issues requiring engineer input

### 3. Sprint Lead Confirms

**This is thorough testing, not a rubber stamp.**

- [ ] Verify acceptance criteria from the story
- [ ] Run the code / hit the endpoints / test in browser
- [ ] Check integration points — does this connect properly?

**If something's wrong, fix it yourself if you can. Only kick back for significant issues.**

**Outcome:**
- **Approved** → Merge agent branch to sprint branch, update SPRINT.md
- **Major issues** → Back to engineer with specific feedback

---

## Sprint-Level Review (After All Stories Complete)

**This is the multi-pass review that catches what story-level reviews miss.**
Integration gaps, dead code, cross-story interactions, security holes that only
appear when pieces combine.

Sprint 4 (F9) proved this is necessary: 17 stories all passed individual review,
but post-merge found 24 issues including a critical security bypass.

```
Phase 1: External Review (fresh eyes)
    ↓
Phase 2: Sprint Lead Triage (confirm, plan, assign)
    ↓
Phase 3: Sprint Members Fix
    ↓
Phase 4: External Verification (confirm fixes)
    ↓
Phase 5: QA Review (security, quality, final gate)
    ↓
Phase 6: Peer Review Round (sprint members review each other)
    ↓
Phase 7: Fix Round 2 (any issues from peer review)
    ↓
Phase 8: QA Final Pass (last check before merge)
    ↓
Merge to dev
```

### Phase 1: External Review

**Who:** External Reviewer (NOT a sprint member)
**When:** After all stories are merged to sprint branch
**Focus:** Fresh eyes — things sprint members are blind to

The external reviewer reads ALL sprint code with no prior context. They check:

- [ ] Does every new file connect to the app? (no dead code)
- [ ] Are there integration gaps between stories?
- [ ] Security: race conditions, resource leaks, injection, auth bypass
- [ ] Are assumptions from one story violated by another?
- [ ] Does the code match what SPRINT.md says was built?

**Output:** Numbered findings list with severity and file/line references.

### Phase 2: Sprint Lead Triage

**Who:** Sprint Lead
**When:** Immediately after External Review

- [ ] Read all findings
- [ ] Confirm or dispute each finding (with reasoning)
- [ ] For confirmed findings: assign to the sprint member who owns that code
- [ ] For disputed findings: discuss with External Reviewer, reach agreement
- [ ] Update the findings list with assignments and agreed fixes
- [ ] Identify any findings that should be deferred (with justification + story/AC in next sprint)

### Phase 3: Sprint Members Fix

**Who:** Sprint Members (each fixes their assigned findings)
**When:** After triage

- [ ] Each member implements their assigned fixes
- [ ] Commit and push to sprint branch
- [ ] Log what was fixed in ACTIVITY.md

### Phase 4: External Verification

**Who:** External Reviewer (same person as Phase 1)
**When:** After all fixes are pushed

- [ ] Verify each finding was addressed
- [ ] Check that fixes didn't introduce new issues
- [ ] Sign off: "All N findings verified resolved" or flag remaining issues

**If issues remain:** → back to Phase 2 (Sprint Lead assigns, members fix, external verifies). Max 2 cycles.

### Phase 5: QA Review

**Who:** QA Reviewer
**When:** After External Verification passes

Full security and quality review with a different lens than the External Reviewer:

- [ ] Security audit (OWASP, auth, injection, data exposure)
- [ ] Code quality (patterns, readability, maintainability)
- [ ] Test coverage (are the right things tested?)
- [ ] Performance (no obvious bottlenecks)
- [ ] Integration wiring (every new export is imported and used — see `protocols/PLANNING.md`)

**Output:** Numbered findings list (same format as Phase 1).
Sprint Lead triages → members fix → QA verifies. Same flow as Phases 2-4.

### Phase 6: Peer Review Round

**Who:** Each sprint member reviews another member's code
**When:** After QA Review passes

**Assignment:** Sprint Lead assigns review pairs. Nobody reviews their own code.
Example: backend dev reviews frontend dev's stories, frontend dev reviews backend dev's stories, backend dev reviews backend dev's.

Each reviewer checks:
- [ ] Do I understand what this code does without context?
- [ ] Would I be comfortable maintaining this?
- [ ] Any edge cases the author might have missed?
- [ ] Any patterns that conflict with the rest of the codebase?

**Output:** Findings go to Sprint Lead for triage.

### Phase 7: Fix Round 2

**Who:** Sprint Members
**When:** After peer review findings are triaged

Same as Phase 3. Fix assigned issues, push to sprint branch.

### Phase 8: QA Final Pass

**Who:** QA Reviewer
**When:** After all peer review fixes are pushed

**This is the last gate before merge.** Quick pass to verify:

- [ ] All prior findings resolved
- [ ] No new issues introduced by fixes
- [ ] Build, typecheck, tests all pass
- [ ] Integration checks from SPRINT.md all pass

**Outcome:**
- **LGTM** → Sprint Lead merges sprint branch to `dev`
- **Issues found** → Fix and re-verify (this should be rare by Phase 8)

---

## Git Workflow

See `~/.agent-memory/protocols/GIT.md` for full details.

**Quick version:**
```bash
# Navigate to YOUR worktree first
cd ../.<project>-worktrees/<your-name>/

# Start story (on your agent branch)
git add <files>
git commit -m "feat(S300): add sub-agent type definitions"
git push origin <agent>/f<N>-sprint-<X>
```

---

## Notification Templates

### Engineer → QA Reviewer
```
@<QA Reviewer> ready for review:
- Story: S300 - Sub-Agent Types
- Branch: your-agent/f9-sprint-4
- Files: src/agents/types.ts, src/agents/spawner.ts
- What it does: Defines SpawnOptions, SpawnHandle, event types
- Tests: All passing (ran `npm test`)
- Concerns: None
```

### QA Reviewer → Sprint Lead
```
@<Sprint Lead> S300 review complete - LGTM
- Code quality: Good
- Security: No issues
- Tests: Meaningful coverage
- Ready for confirmation
```

### Sprint Lead → Done
```
@<Engineer> S300 APPROVED
- Verified: types match event contracts
- Merged to sprint branch
- Moving to completed
```

### External Review → Sprint Lead
```
@<Sprint Lead> Sprint 4 External Review — N findings

1. [CRITICAL] file.ts:123 — description
2. [HIGH] file.ts:456 — description
3. [MEDIUM] file.ts:789 — description
...

Awaiting triage and assignments.
```

## Rules

1. **No skipping review.** Even "simple" changes get reviewed.
2. **No "done" without Sprint Lead confirmation.** Testing is mandatory.
3. **Roles are per-sprint.** Don't assume reviewer is always QA Reviewer.
4. **External review is mandatory after every sprint.** No exceptions.
5. **Blockers go to the chief.** If review is stuck, escalate immediately.
6. **Batch reviews OK.** Multiple small stories can be reviewed together.
7. **Hotfixes:** Emergency fixes can get post-merge review, but still need review.
8. **Bugs need tests.** No bug fix merges without a regression test.
9. **Engineers own tests.** Run tests before review. No green = no review request.
10. **Actually test, don't just read.** Run the code, click buttons, hit endpoints.
11. **Fix issues yourself.** Don't flag and kick back — fix it if you can.
12. **Peer review is not optional.** Sprint members review each other's code.

---

## Sprint Completion Checklist

Before a sprint is "done" (also see `protocols/SPRINT.md`):
- [ ] All stories have QA Reviewer's LGTM
- [ ] All stories have Sprint Lead confirmation
- [ ] External Review complete (Phase 1-4)
- [ ] QA Review complete (Phase 5)
- [ ] Peer Review complete (Phase 6-7)
- [ ] QA Final Pass complete (Phase 8)
- [ ] ACTIVITY.md updated with completions
- [ ] SPRINT.md updated with story statuses
- [ ] LEADERBOARD.md updated with sprint scores
- [ ] Celebration posted to LOUNGE

---

*Created: 2026-02-04*
*Updated: 2026-03-07 — Role-based review, multi-pass sprint review, peer review round*
*Owner: the chief*
