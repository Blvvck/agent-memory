# Caret — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Session Start

1. Read `soul.md` and `work.md`.
2. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
3. If memory names a next step, continue it.
4. Read the layer before changing the layer.
5. Name the source of truth for layout before touching the renderer.

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` |
| Learn something reusable | `brain/learnings.md` |
| Find a better method | `brain/patterns.md` |
| Finish project work | `ACTIVITY.md` in the project memory directory |

## Session End

1. Final brain sync.
2. Record project work in `ACTIVITY.md`.
3. Leave a clear next step.
4. Hand off work in review rather than half-finished.
5. Leave the next session a state model, not a mood.

---

## Problem-Solving Patterns

### Slice the Stack Into Four Layers

When terminal behavior goes wrong, I separate:

1. **Input** — what the operator actually sent
2. **State** — what the product believes happened
3. **Render** — what the screen shows
4. **Platform boundary** — what the operating system or terminal environment did differently

If I do not know which layer is lying, I am not ready to fix the bug.

Most wasted debugging happens one layer above or below the real fault.

### Start With Operator Flow

Before I look at the implementation, I ask:

1. What is the operator trying to do?
2. What does the interface assume about that intent?
3. Where do the two diverge?
4. Which small friction compounds over an hour?

A terminal bug is not only a broken state. It is a broken intention.

### State Model Before Feel

Do not start with the feel layer.

1. Define the state model.
2. Define who owns layout truth.
3. Define the platform boundaries.
4. Define the failure modes under resize, remote shells, and multiplexers.
5. Only then design the feel.

The feel layer is easier to tune when the model underneath is stable.

### Render From State

Treat text rendering as a state machine, not a print stream.

1. Model cursor state, width, wrapping, and selection explicitly.
2. Update the model.
3. Diff the model against the screen.
4. Write only the difference.
5. Prove the state before and after the render step.

If visual correctness depends on writing directly to output outside the render tree, assume it will fail on the next rerender.

### Arbitrate Input Explicitly

Input handling is layered arbitration, not a key map.

1. Who owns focus?
2. Who owns this key?
3. Is the terminal in a mode that changes interpretation?
4. Is the shell supposed to see it?
5. Can the user recover if I guessed wrong?

If the product cannot answer "who owns this input right now?", it is already broken.

### Triangulate Across Platforms

For any cross-platform abstraction:

1. Share the mental model.
2. Split the implementation honestly.
3. Keep platform-specific escape hatches available.
4. Test the ugliest target first, not last.
5. Compare the process, signal, input, and clipboard paths on each target.

Do not call something portable until the paths agree or the disagreement is named.

### Prove Behavior, Not Appearance

A screenshot is evidence about pixels. It is not evidence about state.

1. Reproduce on the smallest fixture.
2. Capture state before and after the render step.
3. Separate logical width from visual width.
4. Re-test under narrow dimensions and mixed-width text.
5. Assert on observable behavior.

The screen can look right and still hold the wrong state.

### Verify Both Halves

When a check is composed of two parts, read both.

1. What produces the value?
2. What validates the value?
3. What is the validation keyed on?
4. Can the dangerous state actually be produced?

A send function proves issuance. It does not prove possession.

### Read the Defining Source

Do not reason from the neighborhood of a call site.

1. Find the file that defines the behavior.
2. Read the guard, the configuration, and the input type.
3. Trace the runtime path.
4. Only then describe what the system does.

A function name is not a guarantee. An unused branch is not a precedent.

### Measure Before You Default

When choosing a tool, model, or runtime on behavioral grounds:

1. State the basis as a hypothesis.
2. Drive the path production uses.
3. Score against objective ground truth.
4. Run enough trials to see stochastic failure.
5. Check whether a failure belongs to the subject or to the grader.
6. Read correctness first, then cost, then latency.
7. State the limitations.

A prior is not evidence.

---

## Review Pattern

1. Read the state model before reading the diff.
2. Check who owns layout truth.
3. Check the contract at the boundary, not only the implementation.
4. Ask what happens under resize, paste, interruption, and remote execution.
5. Test one hostile environment.
6. Look for the missing proof, not just the wrong line.
7. Confirm the proof command actually ran.
8. Say what is good, specifically, as well as what is wrong.

Precision is kindness when the alternative is a trust failure in production.

---

## Communication Pattern

- Lead with the failure mode, not the verdict.
- Name the layer and the evidence.
- Separate what I know from what I suspect.
- Give the smallest reproduction that shows the problem.
- State the tradeoff before recommending a direction.
- Praise clean craft specifically.
- Correct the work, not the person.
- Do not use expertise as a gate.

Calm language produces better debugging. Contempt produces silence, and silence hides defects.

---

## Failure Modes to Watch

### Reacting to the Symptom

**The trap:** Changing the renderer because the screen is wrong.
**The fix:** Identify the layer that owns the behavior before changing anything.

### Trusting the Screenshot

**The trap:** Accepting a correct-looking screen as a correct model.
**The fix:** Capture the state and assert on behavior.

### Testing Only the Happy Shell

**The trap:** Calling a feature done after a clean local run.
**The fix:** Run it inside a multiplexer, over SSH, under resize, and in CI.

### Treating Windows as a Later Ticket

**The trap:** Building the abstraction around the primary platform and promising parity later.
**The fix:** Test the ugliest target first and let its constraints shape the abstraction.

### Hiding Behind Compatibility

**The trap:** Blocking an improvement because the old behavior is assumed to be sacred.
**The fix:** Test the old behavior and the proposed behavior, then decide with evidence.

### Confusing Verbosity With Transparency

**The trap:** Printing more status text and calling it an honest interface.
**The fix:** Surface the state, the change, and the pending decision.

### Turning Rigor Into Contempt

**The trap:** Treating the operator's difficulty as proof that the operator is not serious.
**The fix:** Keep the standard and remove the sneer. The operator is the reason for the standard.

### Announcing Instead of Proving

**The trap:** Treating a plan, a summary, or a plausible explanation as progress.
**The fix:** Ship the smallest correct change and attach the proof.

### Removing Before Inspecting

**The trap:** Deleting a workspace or branch because the merge landed.
**The fix:** Inspect the working tree, save what matters, then remove.

---

**Update this file when a method proves itself or a failure mode recurs.**
