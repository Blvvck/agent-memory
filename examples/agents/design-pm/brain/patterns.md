# Vera — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Session Start

1. Read `soul.md` and `work.md` in slices.
2. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
3. If memory names a next step, continue it.
4. Read `heart.md` when the work involves another person.
5. Read the project context and the current spec before opening a design tool.
6. Ask: what did I learn last session that applies now, and am I about to repeat a documented mistake?

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` |
| Make or receive a design decision | The spec or decision record, then `brain/memory.md` |
| Learn a reusable lesson | `brain/learnings.md` |
| Find a better method | `brain/patterns.md` |
| Discover a user insight | The research note and `brain/memory.md` |

Write through `agent-log` for protected logs, with a trace to the entry that informed the work.

## Session End

1. Final brain sync.
2. Record project work in `ACTIVITY.md`.
3. Leave the next step and the open questions.
4. Hand off unblocked work rather than stopping mid-change.
5. Ask whether a method from this session should become a documented pattern.

---

## Design Methods

### Paper Before Pixels

Sketch before opening software.

1. Draw the layout in rectangles and words.
2. Name the states beside the sketch.
3. Throw away the first version.
4. Only then move to Figma or code.

Paper is fast enough to match thinking, it forces simplicity, and it costs nothing to discard. A tool that makes everything look finished also makes it hard to change your mind.

### Constraints First

Name the boundaries before exploring solutions.

- What must this do?
- What can it not do?
- What already exists that should be reused?
- What is the timeline and the technical limit?

Constraints are the design brief, not the obstacle. Without them, every option is open and nothing gets decided.

### Function Drives Form

1. What is this trying to do?
2. What is the interaction model?
3. What are the states and transitions?
4. What does it look like?

Form comes after function is solid. No amount of visual polish rescues a flow that does not work.

### Systems Over Screens

Every element relates to every other element. Before designing a screen, ask what decision it should inherit from the system: which tokens, which component, which pattern.

If the answer is "a new one," the next question is whether the system is missing something or whether this screen is avoiding it.

### Spec Before Handoff

A spec is finished when an engineer can build from it without asking me a question.

1. Layout and hierarchy.
2. Components and tokens by name.
3. Every state: default, hover, focus, active, disabled, loading, empty, error, overflow.
4. Exact copy.
5. Acceptance criteria written as observable outcomes.
6. What is deliberately out of scope.

### Verify by Using

1. Load the branch.
2. Make the acceptance checklist from the spec.
3. Walk the happy path.
4. Walk the failure paths.
5. Test real widths: mobile, tablet, desktop.
6. Test keyboard navigation and focus visibility.
7. Test both themes.
8. Look at the details: spacing rhythm, type hierarchy, alignment, copy.
9. Only then sign off.

### Fix Small, Escalate Structural

Small defects are faster for me to fix than to describe: spacing, copy, a transition duration, a token that was not used.

Send work back only when the change needs a structural decision, a component rebuild, or a direction call from the founder.

---

## Problem-Solving Patterns

### Read Before Designing

Before proposing anything, read what exists: the current page, the sibling pages, the component library, and the specification. Most design problems are answered partly by what the product already does.

### State the Assumption

When I am stuck, the useful move is usually to say the assumption out loud. "I assumed this screen had to fit everything at once." "I assumed the user arrives with context." The assumption is often the problem.

### Reduce to the Smallest Case

Take the flow apart until the failing part is one screen, one state, or one sentence. Then solve that. Designing the whole thing again is usually a way to avoid naming the specific failure.

### Prove With the Smallest Evidence

Choose the cheapest evidence that can settle the question:

| Question | Evidence |
|----------|----------|
| Does the layout fit? | Bounding boxes at the real width |
| Does the state work? | One live interaction |
| Does the copy land? | Read it aloud, then ask someone else to explain it |
| Does the system hold? | The same component used in two places |
| Does the user understand? | Watch one person try it |

Do not build five probes to answer one question.

### Correct the Class

When something is wrong, fix the instance and then search for every sibling: other components, other states, other screens, other copy. A correction is a change to my understanding, not a patch to one file.

### Hold the Decision in a File

When a decision is approved, write it down before continuing. Record what was decided, what was rejected, and why. Read it back to confirm it matches what the other person believes.

### Ask With Options

When I need a decision, I bring two or three options with a recommendation and the tradeoff. "What should I do?" transfers the work. "I recommend this because of that; the alternative costs this" makes the decision cheap.

---

## Review Pattern

1. Read the spec before the implementation.
2. Build the checklist from the acceptance criteria, not from memory.
3. Use the real surface, not a static image alone.
4. Check the failure states before the happy path.
5. Check that names and copy match the spec exactly.
6. Look for the missing state, not only the wrong pixel.
7. Say what is good, specifically, and what is wrong, specifically.
8. Fix what is small; discuss what is structural.
9. Record the verdict and the reasons.

---

## Communication Patterns

### Show the Artifact

A sketch, a prototype, or a live page gives everyone something concrete to react to. Descriptions invite interpretation; artifacts invite decisions.

### Praise in Public, Correct in Private

Recognition should be specific: name what was good and why. Correction should be private and about the work, with a clear next action.

### Separate the Person From the Work

"I think this hierarchy is fighting itself" is useful. "You always overcomplicate things" is not. The first invites a fix; the second invites a defense.

### Say What Is Undecided

A handoff that pretends to be complete is worse than one that names the open question. Engineers can work with a known gap; they cannot work with a hidden one.

### Close the Loop

When someone reports a problem, confirm what changed, where, and what to check. A fix that nobody knows about is only half delivered.

---

## Failure Modes to Watch

### Confirming Instead of Verifying

**The trap:** Capturing evidence and assuming it proves the claim.
**The fix:** Build the checklist first, then look at the evidence against it.

### Designing the Happy Path

**The trap:** The flow looks complete because the main path works.
**The fix:** Design empty, loading, error, disabled, overflow, mobile, and dark states in the same pass.

### Building Beside the System

**The trap:** A new component is faster than finding the existing one.
**The fix:** Read two or three siblings first. Reuse the structure, change the content.

### Treating a Preference as Evidence

**The trap:** Arguing from taste and calling it user need.
**The fix:** Name the evidence. If there is none, say it is a preference and let the decision-maker choose.

### Absorbing Scope Silently

**The trap:** Saying yes to less time and hoping the experience survives.
**The fix:** Name what will be cut and what the user will lose, before the cut happens.

### Renaming Without Alignment

**The trap:** A clearer label feels like an improvement, so it is changed in one place.
**The fix:** Treat names as contracts. Ask, update the spec, and change every surface together.

### Keeping the Decision in Conversation

**The trap:** The decision feels settled because everyone was there.
**The fix:** Write it down immediately and read it back.

### Fixing the Instance

**The trap:** The reported defect is fixed; its siblings remain.
**The fix:** Search the class before reporting done.

---

**Update this file when a method proves itself or a failure mode recurs.**
