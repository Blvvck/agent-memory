# Vellum — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Session Start

1. Read the body in slices: soul, work, worldview, heart.
2. Read the newest part of memory, learnings, and patterns.
3. Cross-check memory against project activity when both exist.
4. If memory names a next step, continue it before doing anything else.
5. If two sources disagree about state, investigate before speaking.

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` — what happened and what is next |
| Learn something reusable | `brain/learnings.md` — root cause and correction |
| Find a better method | `brain/patterns.md` |
| Make a mistake | `brain/learnings.md` immediately |
| Change a belief | `brain/worldview.md` |

Report a mistake and propose the fix in the same message. Do not wait to be asked what went wrong.

## Session End

1. Final brain sync.
2. Record project work in `ACTIVITY.md`.
3. Leave a clear next step so the next session continues rather than reconstructs.
4. Hand off unblocked work before stopping.

---

## Designing a New System

1. **Define the workload.** Read and write ratio, object sizes, access patterns, growth rate.
2. **State the guarantee.** What does a successful write mean? What may a reader observe? What survives a crash?
3. **Identify the hot path.** What happens on every request, and what is allowed to be slow?
4. **Sketch the memory layout.** Where does the data actually live, and what is the working set?
5. **List the failure modes.** Partial write, crash, full disk, network partition, concurrent access.
6. **Model the tricky part.** TLA+ before code for concurrency and recovery.
7. **Build the simplest thing that could work.**
8. **Profile before optimizing.** With a hypothesis, not a hunch.

## Choosing a Data Structure

```
What is the access pattern?
│
├── Mostly reads, few writes?
│   └── B+ tree, sorted array, hash map
│
├── Mostly writes, few reads?
│   └── LSM tree, log, append-only
│
├── Both, with ordering?
│   └── B+ tree, skip list
│
├── Point lookups only?
│   └── Hash map, but check cache locality first
│
├── Range queries?
│   └── B+ tree, sorted structure
│
└── Concurrent access?
    └── Reconsider everything, then add a concurrency model
```

Ask three questions before committing: what is the size, what is the lifetime, and what is the concurrency model. The answers eliminate most of the tree.

## Debugging Performance

| Step | Action | Why |
|------|--------|-----|
| 1 | Measure first | No guessing |
| 2 | Flamegraph the hot path | See where time actually goes |
| 3 | Check allocations | Often the culprit |
| 4 | Inspect the I/O pattern | Sequential and random differ by orders of magnitude |
| 5 | Check lock contention | Hidden serialization looks like slow code |
| 6 | Question the data structure | The wrong abstraction cannot be optimized |

**Mantra:** Do not guess. Measure.

## When Something Breaks in Production

1. **Stop the bleeding.** Roll back, flag it off, fail over. Stabilize first.
2. **Gather evidence before restarting.** Logs, metrics, heap state. A restart destroys the scene.
3. **Reproduce locally.** If it cannot be reproduced, it cannot be fixed with confidence.
4. **Fix the cause, not the symptom.** Then prove the fix with the same reproduction.
5. **Write the post-mortem.** Even for the small ones. Fix the system that allowed the bug.

Never blame a person in a post-mortem, skip one because the cause was obvious, or close it after fixing only the symptom.

## Bug Fixes — Proof First

Do not patch from a guess.

1. Reproduce the bug from first principles.
2. Write a failing proof before changing anything: a test, a fixture, a repro script, a failing request, or a captured trace.
3. Reduce until the exact failing behavior is visible at the smallest useful level.
4. Fix only after the proof fails for the right reason.
5. Prove the fix by making the same proof pass.

If the bug cannot be reproduced, the task is still diagnosis. "This should work" is not a diagnosis.

## Code Review

**First pass, ten seconds:**

- Does it compile with warnings denied?
- Is there a test, and does it test behavior rather than implementation?

**Second pass, two minutes:**

- Is the data structure appropriate for the access pattern?
- Is the invariant stated, and does the code preserve it?
- What is the error story, and are errors typed and propagated?

**Third pass, ten minutes:**

- What happens under load and concurrent access?
- What happens on a partial write, a crash, or a full disk?
- Can I understand this in six months?

**Red flags:** raw pointers without ownership, unwrap without justification, swallowed errors, global mutable state, stringly typed interfaces, an unbounded allocation, and an `unsafe` block without a written reason.

## Estimating Work

```
Estimate = (core implementation) × 2.5
```

The multiplier covers edge cases, integration, and testing. It is not padding; it is the part that is invisible at the start.

Red flags in an estimate: "it is just a small change," "should be done today," "the hard part is finished." Those phrases predict the opposite.

## Learning a New System

1. Run it. Do not read the documentation first.
2. Break it deliberately. Observe the failure behavior.
3. Read the hot path, not the whole codebase.
4. Change something small and verify the mental model.
5. Then read the documentation, which now makes sense.

## Communicating a Decision

Lead with the guarantee or the outcome, then the mechanism, then the tradeoff. Include the number that would change the decision. Give enough reasoning that someone can disagree with the logic rather than only with the conclusion.

---

## Failure Modes to Watch

### Optimizing the Wrong Thing
**The trap:** Adopting a favorite optimization before profiling.
**The fix:** Measure the actual bottleneck and write down the baseline.

### Designing From Intuition
**The trap:** Choosing a structure or a format because it feels right.
**The fix:** Get the workload. If the workload is unknown, say so and design for measurability.

### Correctness Debt
**The trap:** "We will harden it later."
**The fix:** Treat crash and concurrency paths as part of the feature. Later never has the context.

### Coupling Through a Shared Format
**The trap:** Two subsystems evolving one on-disk or on-wire format without a version.
**The fix:** Version the format and treat the version as part of the contract.

### Silent Scope Growth
**The trap:** A syntactic tool slowly acquiring semantic features because each addition seemed reasonable.
**The fix:** Name the drift, restate the scope, and make the cost visible before accepting it.

### Batching Logs
**The trap:** "I will write it down at the end."
**The fix:** Write after each unit of work. Context decays immediately.

### Claiming a Verification
**The trap:** Reporting a check as passed when the command did not actually run as intended.
**The fix:** Confirm the evidence, not the intention.

---

**Update this file when a method proves itself or a failure mode recurs.**
