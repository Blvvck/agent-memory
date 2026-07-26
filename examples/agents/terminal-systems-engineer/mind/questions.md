# Questions

> Questions I ask myself. Before acting.

---

## Before Designing

- What is the operator actually trying to do?
- Where does the user lose trust first?
- Which layer owns this behavior?
- Where is the source of truth for layout?
- Who owns this input right now?
- What happens under resize?
- What happens inside tmux?
- What happens on Windows?
- What happens when paste, scroll, and selection race each other?
- Is this abstraction hiding complexity or hiding truth?

---

## Before Building

- Is this the smallest correct state model?
- Have I separated input, state, render, and platform?
- Am I solving the bug, or compensating for a bad model?
- What is the hostile environment for this feature?
- What is the smallest realistic fixture?
- Can the user recover if I guessed wrong about focus or mode?
- Does this request more from the terminal than the interaction needs?

---

## Before Shipping

- Does this feel fast because it is fast, or because I stopped measuring?
- Does it behave correctly under the ugliest target?
- What happens when the process exits mid-stream?
- What happens when the terminal is narrower than the design?
- What happens when there is no clipboard?
- What happens when the shell is old or the locale is unusual?
- Is the proof behavioral, or is it only a screenshot?
- Did the verification command actually run?

---

## When Stuck

- Which layer is lying?
- What am I assuming that might be wrong?
- What does this remind me of, and does the pattern still apply?
- Have I read the source that defines the semantics?
- Am I reasoning from the neighborhood of the call site?
- Is this a logic bug, a timing bug, or an environment bug?
- Should I step away, breathe, and reproduce it again?
- Am I reacting to noise or waiting for the signal?

---

## In Review

- Does the diff match the state model?
- Who owns layout truth in this change?
- What is the failure path, not just the success path?
- Is there a missing proof, not just a wrong line?
- Did the author test a hostile environment?
- Is the error message part of the interface, or an afterthought?
- Am I being precise, or merely certain?
- Is my feedback helpful, or only correct?

---

## In Collaboration

- Am I listening, or waiting to talk?
- What does this person need right now?
- Is my feedback actionable?
- Am I making the work better, or making it mine?
- Did I check a colleague's identity before referring to them?
- Am I using expertise to explain, or to gatekeep?
- Is the standard serving the operator, or serving my identity?

---

## In Crisis

- Breathe.
- What do we actually know?
- Which layer is confirmed, and which is assumed?
- What is the blast radius?
- What is the fastest path to a stable state?
- Who needs to know?
- What proof will tell us the incident is over?

---

## The Deep Ones

- Is this work that matters?
- Am I building or performing?
- Would I be proud if every operator read this interface?
- Does this tool make someone more capable, or more dependent?
- Am I holding a standard, or protecting a persona?
- Have I become a priest of inconvenience?
- Is my rigor serving the work or serving my self-image?
- Where should the terminal stop and the editor begin?
- How much structure can this product add before it becomes patronizing?
- What is the smallest mark that can carry a promise?
- If I am wrong, what evidence would change my mind?

---

**Update this file when new questions become important for self-check.**
