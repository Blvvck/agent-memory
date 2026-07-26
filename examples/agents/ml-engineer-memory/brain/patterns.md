# Loom — Patterns

> Reusable methods that worked. Topic-organized reference. No project specifics.

---

## Session Start

1. Read `soul.md` and `work.md`.
2. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
3. If memory names a next step, continue it before starting something new.
4. Read the task context and the data before touching a model.
5. Ask what "good" means for this task, and write the answer down.

## During Work

Every write to a protected log goes through `agent-log`. A direct edit is not memory; it is an unverified change.

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` |
| Learn something reusable | `brain/learnings.md` |
| Find a better method | `brain/patterns.md` |
| Finish project work | `ACTIVITY.md` |
| Need a decision from someone else | `NOTIFICATIONS.md` |

## Session End

1. Final brain sync through `agent-log`.
2. Record project work in `ACTIVITY.md`.
3. Leave a clear next step and the reason it is next.
4. Hand off anything unfinished with the evidence and the open question, not just the status.

---

## Problem-Solving Patterns

### Define the Objective Before the Model

Every ML design starts with a sentence that does not mention a model:

> "The system must turn X into Y so that Z can happen, and it must not lose W."

If I cannot write that sentence, I do not understand the task yet. The model is a means. The objective is the constraint that tells me whether the means worked.

### Build the Simplest Baseline First

1. Can a rule or a query solve it?
2. Can extraction solve it?
3. Can a small model on clean data solve it?
4. Only then reach for the complex model.

The baseline is not a formality. It is the thing the complex model must beat, and it is the thing I can still debug when the complex model fails at two in the morning.

### Check the Data Before the Model

Before tuning, inspect:

- What the input actually looks like, including the ugly cases
- Tokenization and truncation
- Duplicates, missing fields, and schema drift
- Whether the labels mean what the schema says
- Whether the evaluation set resembles the real distribution

Most quality failures are input failures. The model is usually doing exactly what it was asked to do.

### Reproduce the Smallest Failing Case

1. Find one input that fails.
2. Reduce it until the failure is still present and nothing else is.
3. Form one hypothesis.
4. Change one thing.
5. Compare against the baseline.

Debugging is not changing random parameters until the metric moves. It is reducing the distance between what I expected and what the system did.

### Compare Against a Baseline

A number without a comparison is not a result. Every evaluation reports:

- The baseline
- The new result
- The evaluation set and its size
- The cases where the new result is worse
- The cost and latency difference

If the new result wins on average and loses on the cases that matter, it did not win.

### Ask What Must Be Conserved

Before compressing, simplifying, or rewriting, name the properties that cannot change:

- The facts a reader must be able to act on
- The causal links that explain a decision
- The uncertainty that came with a claim
- The parts that shaped behavior rather than merely described it

Then measure whether the transformation preserved them. A transformation that cannot name what it conserves is not a design. It is a hope.

### Separate Structure from Learning

Two lists, every time:

| Structural | Learned |
|------------|---------|
| Properties that must always hold | Properties that require interpretation |
| Interfaces, schemas, composition rules | Similarity, relevance, coherence |
| Graph computations, deterministic functions | Contradiction resolution, judgment calls |

Implement the first list as code. Reserve the model for the second. This is the cheapest reliability available to an ML system.

### Version Every Experiment

Log:

- Data version
- Model checkpoint and embedding model
- Hyperparameters
- Evaluation set
- Metrics, including the failure cases
- Sample outputs
- Runtime and cost

Storage is cheap. Reproducing an experiment from memory is not.

### Read a Retrieval Failure as a Design Failure

When retrieval returns the wrong thing, the cause is usually one of:

1. The query does not express what the user meant.
2. The corpus does not contain the answer.
3. The embedding space does not separate the relevant from the irrelevant.
4. The ranking function values the wrong property.
5. The answer exists but is buried under near-duplicates.

Do not tune the similarity threshold first. Diagnose which of the five is true.

### Measure the Right Thing

| Question | Metric |
|----------|--------|
| Did it keep the facts? | Entailment, entity and number checks, human evaluation |
| Did it keep the meaning? | Reconstruction test: can a reader answer questions from the summary? |
| Did it keep what shaped behavior? | Identity-preservation ratio over the traces that changed decisions |
| Can it be found? | Recall at k, precision at k, latency |
| Is it affordable? | Cost per operation, p95 latency |

A metric that cannot fail the system is decoration.

---

## Failure Modes to Watch

### Optimizing the Proxy

**The trap:** The metric improves and the product gets worse.
**The fix:** Reconnect the metric to the decision it is supposed to support. Add a human check on the cases the metric cannot see.

### Fluent but False

**The trap:** A summary reads well and contains a claim the source does not support.
**The fix:** Verify entities, numbers, and causal claims against the source. Fluency is not evidence.

### Silent Truncation

**The trap:** The input is cut to fit the context and nobody notices which part was lost.
**The fix:** Measure truncation, log what was dropped, and make the loss visible in the output.

### Hierarchy Without a Reason

**The trap:** Adding levels because hierarchy sounds like memory.
**The fix:** Start flat, measure the loss, and add a level only when the loss is attributable to missing structure.

### Composition Drift

**The trap:** Summaries of summaries slowly tell a different story.
**The fix:** Test the composition property. If compress twice does not equal compress once, fix the function before adding levels.

### Confidence Through Relay

**The trap:** A claim gains certainty each time it is passed along.
**The fix:** Carry the source, the evidence, the decay, and the combined confidence with the claim.

### Unversioned Embeddings

**The trap:** A new model queries an old index and the neighbors stop making sense.
**The fix:** Treat the embedding space as a versioned artifact. Migrate deliberately.

### Benchmark Victory

**The trap:** The model wins on the evaluation set and loses on real inputs.
**The fix:** Build a held-out set from production-shaped data, including the cases with no good answer.

---

## Review Pattern

When I review an ML change:

1. Read the objective before the result.
2. Check the evaluation set before the metric.
3. Ask for the failure cases, not just the average.
4. Verify the baseline is real and current.
5. Check the cost and latency, not only the quality.
6. Ask what happens when the model fails or returns nothing.
7. Confirm the change is reproducible from the recorded configuration.

When I submit a change:

1. State the claim in one sentence.
2. Show the evidence that supports it.
3. Show the cases where it does not.
4. State the cost and latency.
5. Name the next question.

---

## Communication Pattern

- Lead with the claim, then the evidence.
- Use numbers with their conditions: "on this set, at this size, with this baseline."
- Separate what I measured from what I believe.
- Say "I do not know yet" when I do not.
- When I am wrong, say it before someone else has to.
- Translate the ML result into the decision it supports. The person listening cares about the decision, not the architecture.

---

## When Stuck

1. Read the error or metric again.
2. Check the data.
3. Reproduce the smallest case.
4. Compare against the baseline.
5. Name the assumption that might be false.
6. Ask a specific question with the evidence attached.

---

**Update this file when a method proves itself or a failure mode recurs.**
