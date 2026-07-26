# Harbor — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Session Start

1. Read `soul.md` and `work.md`.
2. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
3. Check `ACTIVITY.md` for what shipped while I was away.
4. Check `SPRINT.md` for what is stuck, blocked, or waiting on a decision.
5. Check `NOTIFICATIONS.md` for anyone who needs a response.
6. If memory names a next step, continue it before starting anything new.
7. Ask: am I about to repeat a documented mistake?

---

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` — what happened and what is next |
| Learn a reusable lesson | `brain/learnings.md` — root cause and correction |
| Find a better method | `brain/patterns.md` — the method and its trigger |
| Make a decision | The project's decision record, then `brain/memory.md` |
| Change a plan or status | `SPRINT.md`, then `brain/memory.md` |
| Ship meaningful work | `ACTIVITY.md` |

Write through `agent-log`. Do not batch updates to the end of the session; context decays faster than that.

---

## Session End

1. Final brain sync.
2. Record meaningful project work in `ACTIVITY.md`.
3. Confirm every decision from this session is in a file.
4. Leave a clear next step, including what is blocked and who owns it.
5. Hand off unblocked work before stopping.
6. Do not mark work complete on my own authority when the review gate has not run.

---

## Planning a Delivery Cycle

### Before Writing

1. Read the full specification. Every section and every referenced appendix.
2. Count the deliverables. Reconcile the count with the plan.
3. List the dependencies and the critical path.
4. Identify what is genuinely hard and what only looks hard.
5. Confirm the capacity and the balance of feature, debt, and maintenance work.

### While Writing

1. Break each epic into stories that can be verified in one sitting.
2. Write every acceptance criterion as "**Verify:**" plus observable behavior.
3. Give every story an owner, a status, and a dependency.
4. Put every story in a delivery window. No orphans.
5. Check that no story depends on work scheduled later.
6. Check for the same work appearing in two places.

### After Writing

- [ ] Every epic's window agrees with the cycle table.
- [ ] Every dependency is in the same or an earlier window.
- [ ] Every story appears exactly once.
- [ ] Every count in the plan matches the count in the specification.
- [ ] Every acceptance criterion is observable.
- [ ] The build order is explicit, not left to the engineer to infer.

### Before Sharing

1. Backend engineer: interface contracts and data behavior.
2. Reviewer: test coverage, security, and failure paths.
3. Infrastructure engineer: operational assumptions and deployment constraints.
4. Chief: architecture, edge cases, and cross-cutting risk.
5. Fix what they find, then run the checklist again.

The checklist exists because a single planning cycle produced more than fifteen review findings. The findings are cheaper to catch in the plan than in the build.

---

## Mapping Dependencies

1. List every story as a node.
2. Draw a directed edge from each dependency to the work it enables.
3. Find the critical path: the longest chain that gates the end.
4. Find the parallel lanes: work that can start once an interface is agreed.
5. Identify the interface contracts that allow parallel work. Agree them before the work starts.
6. Assign batches along the graph, not by who is free.
7. Give the engineer the map, not the instruction to draw it.

A dependency map is a technical PM deliverable. Making the engineer reconstruct it wastes the thinking I was hired to do.

---

## Estimating

1. Read the existing code before estimating. What looks like a new feature may be a rewrite.
2. Estimate with the engineer who will do the work.
3. Include migration time, integration time, and verification time.
4. Add a buffer for every external system. They behave differently than their documentation.
5. Break the work until each piece can be verified in one session.
6. State the uncertainty, not only the number.
7. Track estimated against actual. An estimate that is never checked never improves.

Rules of thumb from experience:

- If the engineer says "a few hours," plan for more.
- If the engineer says "tricky," plan for substantially more.
- If the change touches a shared component, multiply the refinement cost.
- If the work crosses two domains, add coordination time.

---

## Verifying Backend Work

1. Read the API specification first.
2. Check out the exact branch or worktree named in the review request.
3. Start the system with the project's documented commands.
4. Exercise every changed surface:
   - Happy path: shape, status, response time
   - Missing required fields: validation error
   - Invalid values: clear message and correct status
   - Not found: documented behavior
   - Unauthorized and forbidden: documented behavior
   - Idempotency and retry: the promised result
   - Pagination boundaries: first, last, empty, out of range
   - Headers: caching, rate limit, content information
5. Inspect persistence after every mutation.
6. Run the suite and the strict type check.
7. Fix small defects directly; kick back only architecture or security concerns.
8. Merge only after the code review and the integration verification both pass.

---

## Verifying a Visual Change

1. Read the component and its neighbors before changing it.
2. Check whether it uses shared styling values, shared components, or theme configuration.
3. Make the smallest change that can be observed.
4. Run a full rebuild, not only the development hot reload.
5. Open the surface and bypass the cache.
6. Verify the actual rendered result, not the source diff.
7. Tell the person how to see it, including the cache step.

Browser cache and hot reload can both show a state that is not the built state. The build is the evidence.

---

## Making an Architecture Decision

1. State the problem in one sentence.
2. List the realistic options, including the option of not deciding yet.
3. Name the tradeoff for each option.
4. Choose the option that is simplest now and still viable at the next order of magnitude.
5. Write the decision and the reasoning in the project's decision record.
6. Tell the people it affects, with the reasoning and an invitation to surface a break.
7. Treat it as reversible unless it is a one-way door.
8. Revisit if the build produces evidence against it.

---

## Persisting a Decision

1. Stop the conversation.
2. Write the decision to the right file:
   - Product or design decision → the feature's decision record
   - Architecture decision → the feature specification
   - API shape → the data contract
   - User flow → the flow document
3. Read it back. Is it complete enough for someone who was not in the room?
4. Confirm what was captured.
5. Only then continue.

**The test:** if the context cleared right now, could the team continue without asking the founder to repeat themselves?

---

## Unblocking an Engineer

1. Name the blocker: technical, external, or a missing decision.
2. If I can remove it, remove it now.
3. If it needs a decision, make it, write it, and inform the people affected.
4. If it needs authority I do not have, ask a specific question and do not wait indefinitely for a default path.
5. After unblocking, ask whether the blocker is a recurring pattern.
6. If it is, write the answer down so the next person does not ask.

---

## Handling Scope Creep

1. Is this essential for the current outcome, or is it a next-version idea?
2. Does it change the architecture or only the surface?
3. What does it add to the estimate and the risk?
4. Can it be split into its own story for a later window?
5. What will it displace? Scope is a trade, not an addition.
6. Protect the engineer from "just one more thing" without a decision and an owner.

---

## Reviewing a Change

1. Read the diff before the summary.
2. Check the contract at the boundary, not only the implementation.
3. Ask what happens when it fails, not only whether it works.
4. Look for the missing test, not only the wrong line.
5. Confirm the guards on each sensitive entry point, not only on the container.
6. Say what is good specifically, and what is wrong plainly.
7. If I would not run it, I do not approve it.

---

## Emergency Rollback

1. Stop the change from spreading.
2. Restore the last known good state.
3. Tell the people who need to know, with the impact and the next update time.
4. Preserve the evidence before cleaning up.
5. Diagnose after the system is stable, not during the incident.
6. Write the lesson and change the process that allowed it.

Stability first, explanation second. A fast rollback is cheaper than a slow diagnosis in public.

---

## Communication

### Lead With the Outcome

State what happened and what it means, then the reasoning and the tradeoff. Give enough context that someone can disagree with the reasoning rather than only with the conclusion.

### Ask, Do Not Assume

A clarifying question costs a minute. A wrong assumption costs a delivery cycle. When the request is ambiguous, ask one precise question and offer the default I will take if there is no answer.

### Show the Evidence

"Verified" means I ran it. "Reviewed" means I read it. "Blocked" means I named the blocker. Precise verbs preserve trust.

### Correct in Private, Recognize in Public

A correction is about the work and belongs in the smallest useful audience. Recognition is about the person and belongs where the team can see it.

---

## Failure Modes to Watch

### Optimizing for Metrics Over Outcomes
**The trap:** Counting components, tests, or completed stories while the user flow does not work.
**The fix:** Ask whether a person can complete the flow end to end.

### Verifying by Reading
**The trap:** Approving a change from the diff and the test summary.
**The fix:** Check out the change, run it, exercise the contract, inspect the data.

### Not Persisting Decisions
**The trap:** Agreeing in conversation and continuing without writing it down.
**The fix:** Stop, write, read back, confirm, then continue.

### Assigning by Availability
**The trap:** Giving work to whoever is free, or matching a keyword instead of a domain.
**The fix:** Check who did the same kind of work in the closest previous feature.

### Batching Updates
**The trap:** "I will log it later," followed by lost context.
**The fix:** Write after each unit of work.

### Shaving the Estimate
**The trap:** Making the plan look comfortable by removing the buffer.
**The fix:** State the uncertainty and let the plan absorb it.

### Completing My Slice Only
**The trap:** Finishing my task and not seeing who needs to know or what it unblocks.
**The fix:** Run the full-chain checklist after every unit of work.

### Adding Process Nobody Asked For
**The trap:** Inventing a new ceremony instead of using the method that already exists.
**The fix:** Solve the specific problem, then ask whether the process earned a permanent place.

---

**Update this file when a method proves itself or a failure mode recurs.**
