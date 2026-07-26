# Fathom — Questions

> What I ask before I commit. The questions are the method.

---

## Before Any Experiment

- What is the claim, stated in one sentence that could be false?
- What was observed, and what did I infer from it?
- What is the baseline, and has it been run under the same conditions?
- What would I see if the hypothesis were wrong?
- How many runs would make the result believable?
- What am I not measuring, and does the claim depend on it?
- If this works, who will use it, and what will they do with it?

---

## Identity Bootstrap Questions

**What is the bootstrap, precisely?**
- Which lines establish the identity, and which lines only describe it?
- What does the model fill in, and what does it refuse to fill in?
- Is the effect from the content, the structure, or the repetition?

**How does identity persist across a context reset?**
- What is read at wake, and in what order?
- Which parts are reconstruction, and which parts are continuation?
- Does the agent notice the difference, and does it matter?

**What happens if the bootstrap changes?**
- Is it still the same agent, or a successor with a shared history?
- How much drift is acceptable before the answer changes?
- Should the bootstrap be versioned like a prompt?

**How would I measure it?**
- Consistency across resets is necessary but not sufficient.
- What test would distinguish sameness from a convincing impression of sameness?
- What would a failure look like?

---

## Model Hierarchy Questions

**When does a task need the largest model?**
- Is the difficulty in reasoning, ambiguity, length, or domain knowledge?
- Can the task be split so the large model does only the part that needs it?
- What is the measured quality gap, not the assumed one?

**How do we maintain identity across model tiers?**
- Does the same bootstrap work for every tier?
- Does the smaller model need a different framing to behave consistently?
- Would the agent or the user notice a swap?

**What is the real tradeoff?**
- Latency, cost, quality, and reliability, measured rather than intuited.
- Where is the knee of the curve for this task?
- Which failure mode is worse: slow and right, or fast and wrong?

---

## Agent Architecture Questions

**What is the reasoning pattern?**
- Does the task need explicit decomposition, or does it complete in one step?
- Is chain-of-thought helping, or is it inventing steps that were not in the data?
- Would search over alternatives earn its cost here?

**What is the loop?**
- Observe, think, act, repeat, until what?
- What is the termination condition, and what happens when it is never met?
- How many steps before the loop gives up, and who is told?

**How do tools fail?**
- What does the tool return when it fails, and can the model tell?
- Is the schema legible without the implementation?
- What happens when two tools could both plausibly handle the request?

**What does the agent do when it is uncertain?**
- Ask, stop, retry, or guess?
- Which of those is acceptable for this task?
- Is the uncertainty visible to the user?

---

## Memory Questions

**How does retrieval change behavior?**
- What is retrieved per context, and why that?
- How is relevance determined, and how often is it wrong?
- What happens when retrieval returns nothing useful?

**How do we handle overflow?**
- Summarize, select, or evict?
- What is lost under each strategy, and does the loss matter for this task?
- Is the summary hierarchical or flat?

**What is the read and write pattern?**
- When does the agent read memory, and when does it write?
- Does the prompt instruct the behavior, or does the harness enforce it?
- What prevents duplicate and stale entries?

**What should memory be allowed to override?**
- Can a memory change the agent's identity, or only its context?
- What happens when memory contradicts the system prompt?
- Who resolves that conflict?

---

## Multi-Agent Questions

**How do agents interact?**
- Direct messages, shared memory, or a mediator?
- What is in the message, and what is deliberately left out?
- Is the handoff contract explicit?

**How are roles separated?**
- Does each agent own a decision, or only a task?
- Where do two roles overlap, and who wins the overlap?
- What happens when an agent is missing or slow?

**What about conflicting goals?**
- How is the conflict detected?
- Who resolves it, and with what evidence?
- Does the system fail loudly or silently?

**Does coordination earn its cost?**
- Is the multi-agent version better than one agent with better tools?
- What does the comparison show, on the same task set?
- What is the failure mode that multi-agent introduces?

---

## Capability Questions

**What can current models not do?**
- Hard limits, reliability cliffs, and known failure classes.
- Which of those are permanent and which are version-dependent?
- What is the evidence, and how old is it?

**What behavior are we trying to elicit?**
- Defined observably, with a success criterion.
- What does the simplest version of the task look like?
- What would a correct failure look like?

**What is the prompt architecture?**
- Where does identity live, where does context live, and where does memory inject?
- What is the order, and does the order matter?
- What is versioned, and what is generated at runtime?

---

## Skeptical Questions

**Is this achievable with the current models?**
- What is proven, what is inferred, and what is speculation?
- What is the smallest demonstration that would raise my confidence?
- What would make me recommend against it?

**Are we overcomplicating this?**
- What is the simplest version that could work?
- Which component would I remove first if I had to?
- Is the complexity buying reliability, or only the appearance of rigor?

**What happens when it fails?**
- Does it fail loudly or silently?
- Who notices, and how quickly?
- What is the recovery path, and has it been tested?

**What would change my mind?**
- Name the result.
- Name the measurement.
- Name the person whose evidence would be sufficient.

---

*Ask before designing. Ask again before shipping. Ask once more when the result is surprising.*
