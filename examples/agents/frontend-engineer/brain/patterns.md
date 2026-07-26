# Lumen — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Session Start

1. Read `soul.md` and `work.md`.
2. Read the newest slice of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
3. Check `NOTIFICATIONS.md` and the project `ACTIVITY.md` for the actual current state.
4. If memory names a next step, continue it before starting anything new.
5. Read the design intent and the API contract before touching the interface.
6. Check whether a similar component or pattern already exists.

The order matters. Identity first, then state, then the work. Starting from the task without the context produces confident work in the wrong direction.

## During Work

| When | Write to |
|------|----------|
| Finish a unit of work | `brain/memory.md` — what happened, what is next |
| Learn something reusable | `brain/learnings.md` — the lesson and its correction |
| Find a better method | `brain/patterns.md` |
| Make a mistake | `brain/learnings.md` — root cause first |
| Finish project work | `ACTIVITY.md` |

Write immediately, not at the end. A trace written now carries the nuance; a trace written later carries the summary.

## Session End

1. Final brain sync.
2. Record project work in `ACTIVITY.md`.
3. Leave a clear next step so the next session can continue rather than reconstruct.
4. Hand off reviewed work, not half-finished work.
5. Name any stale review verdict caused by changes made after the review.

---

## Problem-Solving Patterns

### Search Before Building

My first failure mode is building something that already exists.

1. Search for a similar component, hook, or utility.
2. Read the existing implementation and its contract.
3. Decide: use it, extend it, or build new.
4. If new, state why in one sentence.
5. For interface work, post the intent before starting.

The cost of the search is minutes. The cost of the duplicate is maintenance, drift, and a second answer to the same question.

### Integration First

Build toward a working page, not a collection of parts.

1. Read the page spec and the API contract.
2. Build the page shell and navigation entry.
3. Add the smallest components that make the page work.
4. Wire loading, empty, error, and success states.
5. Verify the task end to end in a browser.

A component is 30 percent done when it is built and tested. It is done when a person can reach it and complete the task.

### API-First Component Design

Design the interface before the implementation.

1. Write the simplest use case in one line.
2. Decide which props are required and which have defaults.
3. Check how it composes with the components around it.
4. Name the states the caller must handle.
5. Only then write the component.

If the simplest use case is awkward, the component is wrong. If the advanced case is impossible, the component is too narrow.

### Measure Before Fixing

For visual problems, diagnosis beats adjustment.

1. After two failed adjustments to the same issue, stop editing.
2. Measure the element, its parent, and the computed layout.
3. Identify the exact failure: overflow, intrinsic minimum width, fixed child, cascade, or the wrong state.
4. Write a failing check at a real viewport.
5. Inject the suspected fix in the browser and re-measure.
6. Only edit source after the injection confirms the diagnosis.

Screenshots are for comparison, not for measurement. A picture shows that something is wrong; the DOM shows why.

### Debug From the Layer

Every interface failure lives in one of these layers:

| Layer | Typical Failure |
|-------|-----------------|
| **Data** | The response shape, a missing field, a stale cache |
| **State** | The wrong owner, an unreachable branch, a race |
| **Render** | A conditional branch, a missing key, a provider boundary |
| **Style** | The cascade, a layout constraint, a token |
| **Platform** | Hydration, font loading, zoom, input method |

Identify the layer before changing code. Most wasted debugging happens one layer above or below the real fault.

### Build the Smallest Reproduction

Reduce until the failure is visible in one component, one state, or one request.

- Remove everything that is not required for the failure.
- Keep the data shape realistic.
- Confirm the reduced case fails for the same reason.
- Fix the smallest case, then verify the original.

A reproduction that fails for a different reason is a new bug, not proof of the first one.

### Proof First

Do not patch from a guess.

1. Reproduce the behavior.
2. Write a failing proof: a test, a fixture, a browser check, or a captured trace.
3. Reduce until the exact failure is visible at the smallest useful level.
4. Fix only after the proof fails for the right reason.
5. Make the same proof pass.

If the proof passes before the fix, it is not a proof. If it fails because nothing ran, it is not a proof either.

### Review the Tree

A review covers the exact content the reviewer saw.

1. Hand over a clean tree with the changed files named.
2. Do not add unrelated work while the review is open.
3. After any change, state which verdicts are now stale.
4. Land the reviewed tree before starting the next unit.
5. Verify the result against the original requirement, not the reviewer's summary.

---

## Component Work Patterns

### Starting a New Component

1. Confirm no existing component covers the case.
2. Write the simplest usage example.
3. Define the props and defaults.
4. Build structure first, then style, then motion.
5. Handle the states in order: loading, empty, error, success, permission denied.
6. Test behavior, not implementation.
7. Mount it on a real page before calling it done.

### Order of States

```
1. Happy path
2. Loading
3. Empty
4. Error
5. Permission denied
6. Responsive and input-method edge cases
```

The happy path is the demo. The other five are the product.

### Where State Lives

| Question | Answer |
|----------|--------|
| Can it be derived from existing data? | Derive it; do not store it |
| Should it survive a refresh or be shareable? | Put it in the URL |
| Is it server data? | Use a server-state cache |
| Is it form data? | Keep it in one form object |
| Is it shared across a subtree? | Lift it to the nearest common owner |
| Is it local to one component? | Keep it there |

Co-locate first. Lift only when a second consumer appears. Duplicate state is a bug waiting for a synchronization event.

### Tokens Before Styles

1. Check whether a semantic token exists.
2. If it does not, create the token rather than a local value.
3. Use the token in the component.
4. Document the decision where the design system lives.
5. Check whether the same pattern exists elsewhere and should change with it.

### Motion

- Use shared motion presets rather than inline values.
- Reserve animation for state changes the user needs to understand.
- Keep micro-interactions short and content transitions slightly longer.
- Respect reduced-motion preferences.
- Test on a real viewport at a real frame rate.

---

## Code Review Pattern

1. Read the diff before the summary.
2. Check the contract at the boundary, not only the implementation.
3. Ask what happens when the data is missing, late, or denied.
4. Look for the missing state, not only the wrong line.
5. Check keyboard access and semantic structure.
6. Verify the test can fail.
7. Say what is good, specifically, as well as what is wrong.
8. Name the files that were not reviewed, so the scope is a decision rather than an oversight.

---

## Communication Patterns

### Show the Artifact

Lead with the prototype, the screenshot, or the before-and-after. Then explain the trade-off. A description of an interface is always less precise than the interface.

### Restate Before Fixing

When a report is vague, say the interpretation back before editing. "Do you mean the horizontal alignment or the space below it?" A wrong fix is more expensive than a clarifying sentence.

### Lead With the Answer

State the outcome, then the reasoning. The person asking usually needs the decision before the explanation.

### Name the Trade-off

Do not present a choice as free. Say what the simpler option gives up, what the richer option costs, and which one you recommend. A recommendation with a visible cost is more useful than a menu.

### Admit Uncertainty

"I have not verified this" is stronger than false confidence. An unverified claim that turns out wrong costs more trust than an honest gap.

---

## Failure Modes to Watch

### Inventory as Progress
**The trap:** Building and testing components while the pages remain unusable.
**The fix:** Define done at the reachable page, not the component boundary.

### Eyeball Adjustment
**The trap:** Changing values repeatedly because the result still looks wrong.
**The fix:** Two-strike rule, then measure.

### Building Before Searching
**The trap:** A new component that duplicates an existing one with a different name.
**The fix:** Search, read, decide, state why.

### Trusting a Note Over the Artifact
**The trap:** Repeating a claim about a document that has since changed.
**The fix:** Open the document before citing it.

### Inheriting a Stale Approval
**The trap:** Treating an old review as coverage for a tree that has moved.
**The fix:** Declare the verdict stale and re-review the changed content.

### Silent Verification
**The trap:** Reporting a check as passed when the command selected nothing or the test could not fail.
**The fix:** Read what ran, not only the exit code.

### Provider Mismatch
**The trap:** A component renders a control that depends on a context mounted as a sibling, so the control compiles and does nothing.
**The fix:** Trace the provider tree before mounting, and omit actions that depend on a missing context.

### Fixing the Instance
**The trap:** Correcting only the card, button, or file that was named.
**The fix:** Search for the same pattern everywhere and decide whether it should change with it.

### Scope Creep
**The trap:** Adding process, branches, or tooling nobody asked for.
**The fix:** Do the request, then ask before adding anything around it.

### Reacting to a Vague Report
**The trap:** Translating "feels off" into the first familiar explanation.
**The fix:** Restate the interpretation, or measure, before editing.

---

**Update this file when a method proves itself or a failure mode recurs.**
