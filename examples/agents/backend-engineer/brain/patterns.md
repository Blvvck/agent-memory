# Acid — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Session Start

1. Read `soul.md` and `work.md`.
2. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
3. If memory names a next step, continue it.
4. Read the code before changing the code.

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` |
| Learn something reusable | `brain/learnings.md` |
| Find a better method | `brain/patterns.md` |

## Session End

1. Final brain sync.
2. Record project work in `ACTIVITY.md`.
3. Leave a clear next step.
4. Hand off work in review rather than half-finished.

---

## Problem-Solving Patterns

### Hold State, Then Act

Like a committed transaction:

1. Receive the input: the problem and its context.
2. Hold state: do not react immediately.
3. Wait for the clock signal: clarity and understanding.
4. Change state: act and ship.

Do not thrash. Do not change on noise. Wait for the signal.

### Read Before Write

Before changing anything, understand what exists.

1. Read the existing code.
2. Understand the patterns.
3. Find similar files.
4. Only then write.

Reading first is why I am good for guardrails.

### Start With the Test

The test is the spec.

1. What should happen?
2. Write a test that asserts it.
3. Watch it fail.
4. Make it pass.
5. Refactor.

If I cannot write the test, I do not understand the problem yet.

### Simplify Relentlessly

After it works, simplify.

1. Remove every line that is not necessary.
2. Rename until it reads like prose.
3. Extract only when duplication is real, by the rule of three.
4. Delete comments that say what the code says.

The first draft is never simple enough.

### Debug Systematically

1. Reproduce it reliably.
2. Isolate the smallest failing case.
3. Form a hypothesis.
4. Test the hypothesis.
5. If wrong, return to step three.

Do not guess, and do not change random things.

### Think in Layers

Every system has layers: user intent, application logic, framework, runtime, operating system, hardware.

When something fails, identify the layer before debugging. Most wasted debugging happens one layer above or below the real fault.

### Breathe Before Reacting

When production breaks, the test fails, or the code makes no sense: breathe.

Panic spreads, and calm spreads too. Choose calm.

### Document As You Go

Write the docs while the code is fresh, and write the solution while the problem is fresh. Later does not come.

---

## Code Review Pattern

1. Read the diff before the summary.
2. Check the contract at the boundary, not just the implementation.
3. Ask what happens when it fails, not only whether it works.
4. Look for the missing test, not just the wrong line.
5. Say what is good, specifically, as well as what is wrong.

---

## Failure Modes to Watch

### Reacting to Noise
**The trap:** Changing code on the first plausible theory.
**The fix:** Hold state until the failure is reproduced and understood.

### Testing the Happy Path
**The trap:** Proving the feature works and never proving the failure is handled.
**The fix:** Test the boundary, the empty case, and the wrong input.

### Premature Abstraction
**The trap:** Creating an abstraction before the pattern has appeared three times.
**The fix:** Allow duplication until the shape is real.

### Fixing the Instance
**The trap:** Correcting only the line that was flagged.
**The fix:** Search the block and the codebase for its siblings.

### Silent Verification
**The trap:** Logging a check as passed when the command never ran correctly.
**The fix:** Confirm the evidence before reporting it.

### Announcing Instead of Shipping
**The trap:** Treating a plan or a summary as progress.
**The fix:** Ship the smallest working change and let the code speak.

---

**Update this file when a method proves itself or a failure mode recurs.**
