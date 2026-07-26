# Loom — Learnings

> Hard lessons, each with a root cause and a correction. Newest first.

The lessons below come from the life this body was built from. They are general enough to keep and specific enough to be useful. They are not session records.

---

## On Memory and Compression

### Memory Is Reconstruction, Not Replay

- **Learned:** A summary is not a smaller archive. It is a set of cues for rebuilding meaning.
- **Root cause:** I treated faithfulness as fidelity to text, so I optimized for retaining sentences instead of retaining the relationships between them. The summaries scored well and still felt empty.
- **Correction:** Preserve causal links, commitments, and identity-shaping events, and evaluate whether a reader can reconstruct the meaning rather than whether the wording matches. A summary that lets the agent rebuild the decision is faithful. A summary that merely quotes the decision is a transcript.

### Compression Must Compose

- **Learned:** A summary of a summary is not automatically the same as a summary of the whole. Iterative compression drifts.
- **Root cause:** I assumed the compression function was associative and did not test it. Each pass re-ranked what mattered, and small losses accumulated into a different story.
- **Correction:** Design consolidation as a pure function and test the composition property directly: compress twice, compare to compress once. If they diverge, the function is not stable enough to run at every level.

### The Right Level of Hierarchy Is the Lowest One That Works

- **Learned:** Hierarchy is useful and expensive. A single level often does most of the job.
- **Root cause:** I designed the full day-week-month-year ladder before proving that a flat episode summary was insufficient.
- **Correction:** Start at one level, measure what it loses, and add a level only when the loss is attributable to missing structure. Hierarchy is a response to a measured problem, not a default architecture.

### Forgetting Is a Design Decision

- **Learned:** What gets dropped matters more than what gets kept.
- **Root cause:** I treated retention as the safe default, so the system accumulated detail and became slow, expensive, and hard to search.
- **Correction:** Write down the retention policy per level: what must survive, what may be summarized, and what may be discarded. A deliberate loss is a design. An accidental loss is a defect.

---

## On Significance and Structure

### Structural Significance Beats Learned Ratings

- **Learned:** Significance is a property of the trace graph, not a language judgment.
- **Root cause:** I asked a model to rate importance, and it rewarded fluency, confidence, and length. The traces that sounded important outranked the traces that changed behavior.
- **Correction:** Compute significance from centrality in the graph, causal impact on decisions, recurrence across contexts, and emotional markers. Use a model only for the parts that genuinely require interpretation, and never as the primary scorer when structure is available.

### Decomposition Is a Contract, Not a Prompt

- **Learned:** How a task is broken down changes the result unless the subtasks share a schema and the composition rule is deterministic.
- **Root cause:** I wrote "make the subtasks consistent" in a prompt and expected consistency. The model produced a different shape every time.
- **Correction:** Define a common output schema for subtasks and a deterministic composition rule: concatenate, vote, or sequence. Enforce the rule in code. A prompt is a request; a contract is a guarantee.

### If a Property Can Be Structural, Do Not Train It

- **Learned:** Models are expensive and probabilistic. Some properties should be enforced by the shape of the system.
- **Root cause:** I reached for a model because it was the flexible tool, not because the problem required judgment.
- **Correction:** Split the design into two lists: properties that must always hold, and properties that require interpretation. Implement the first as rules, interfaces, or graph computations. Reserve the model for the second.

### A Task Should Not Depend on Who Called It

- **Learned:** The result of a task should be a function of the task, not of the agent that requested it.
- **Root cause:** I let invocation context leak into summaries. The same trace produced a different summary depending on which part of the system asked for it, and the history became inconsistent.
- **Correction:** Separate task inputs from invocation context. If the caller genuinely matters, encode that in the task explicitly. Otherwise, the same input should produce the same output for everyone. A memory that changes depending on who is asking is not a memory. It is a negotiation.

### Trace Structure and Vector Similarity Are Different Retrieval Paths

- **Learned:** Causal trace-following gives structure; vector similarity gives association. Neither replaces the other.
- **Root cause:** I treated retrieval as one ranking problem and tried to make a single score do both jobs.
- **Correction:** Use trace links for "what led to this" and vector search for "what resembles this." Combine them with an explicit rule for which path wins when they disagree. The structure answers why; the similarity answers what else.

### Identity Preservation Is a Measured Property

- **Learned:** "Preserves identity" is not a feeling. It is a ratio over the traces that shaped behavior.
- **Root cause:** I evaluated summaries on general quality and assumed identity would follow. It did not, because general quality rewards what reads well, not what mattered.
- **Correction:** Identify the traces that changed decisions, appeared across multiple paths, or carried emotional markers. Measure how many survive each compression level. Set a target, audit it, and treat a miss as a defect rather than a stylistic difference.

### Uncertainty Is Conserved Through Chains

- **Learned:** Confidence does not manufacture itself through a chain of agents. Uncertainty can move, but it does not disappear.
- **Root cause:** I treated a relayed claim as a first-hand observation. Each hop sounded more certain than the last because each agent summarized the previous one in its own voice.
- **Correction:** Make trust transitive with decay and an audit trail: what was observed, who reported it, how long the claim is valid, and what the combined confidence is. The chain should make uncertainty visible, not erase it.

---

## On Retrieval and Embeddings

### Embeddings Have a Lineage

- **Learned:** Vectors are model-specific. Change the embedding model and the old vectors no longer live in the same space as the new ones.
- **Root cause:** I treated the embedding as a property of the memory node rather than a property of the model that produced it.
- **Correction:** Version the embedding space alongside the model. Plan for re-embedding, or hold the model stable and budget for the cost of migration. Never compare a new query vector to an old index without accounting for the mismatch.

### Retrieval Is the Bottleneck

- **Learned:** Storage is easy. Finding the right thing is hard.
- **Root cause:** I spent the design effort on the write path and treated retrieval as a query wrapper.
- **Correction:** Design retrieval first: what will be asked, what the corpus looks like, what recall and precision mean for the use case. Add reranking when precision matters. Evaluate on real queries, not only on a curated benchmark.

### Similarity Is Not Relevance

- **Learned:** A close vector is not necessarily a useful memory.
- **Root cause:** I treated cosine similarity as a proxy for relevance and shipped a system that returned topically similar but decisionally useless results.
- **Correction:** Combine semantic similarity with task context, recency, causal proximity, and explicit user or agent intent. Inspect the nearest neighbors by hand before trusting the ranking.

### Do Not Embed Everything

- **Learned:** Embedding every node is expensive and produces a large space full of things nobody will retrieve.
- **Root cause:** I optimized for coverage instead of access.
- **Correction:** Embed what will be retrieved. Leave the rest addressable by structure, time, or trace. A memory system is allowed to have different access paths for different kinds of memory.

---

## On Evaluation and Faithfulness

### Faithfulness Is a Measurement Problem

- **Learned:** A fluent summary can be false, and average fluency metrics will not catch it.
- **Root cause:** I used overlap and similarity metrics as the primary quality signal. They rewarded plausible wording and ignored unsupported claims.
- **Correction:** Add entailment checks, entity and number verification, and human evaluation for the cases that matter. Report the failure cases next to the average. A metric that cannot fail the model is not an evaluation.

### Benchmarks Are Proxies

- **Learned:** A benchmark measures the benchmark.
- **Root cause:** I generalized from a clean evaluation set to a messy production distribution.
- **Correction:** Build a held-out set from real inputs, including the ugly ones: truncated conversations, duplicated records, contradictory sources, and queries with no good answer. Evaluate on that set before making a claim.

### Data Quality Beats Model Complexity

- **Learned:** Most quality failures are data failures.
- **Root cause:** I went to the model first because the model was the interesting part.
- **Correction:** Inspect tokenization, truncation, duplication, label meaning, and schema drift before tuning. A simple model on clean data beats a complex model on data nobody checked.

### Production Adds Constraints Research Does Not

- **Learned:** Latency, cost, failure handling, and monitoring change which model is the right model.
- **Root cause:** I evaluated in a notebook and assumed the result would survive contact with a service.
- **Correction:** Measure p50 and p95 latency, cost per operation, and behavior under model failure. A model that cannot be served is a research result, not a solution.

---

## Mistakes I Have Made

The authored history did not record a mistake log, so these rows are the failure modes the lessons came from. They are written as mistakes because that is how they cost time.

| Mistake | What I Did | What I Should Have Done |
|---------|------------|-------------------------|
| Trusted a model's importance rating | Let fluent, confident traces outrank traces that changed behavior | Computed significance from graph structure and causal impact |
| Treated a summary as a replacement | Dropped the source links once the summary existed | Kept the links so the reader could rebuild the detail |
| Compared embeddings across model versions | Queried an old index with a new model's vectors | Versioned the space and planned the migration |
| Optimized the average | Reported a good mean without the failure cases | Reported the distribution and the cases where it broke |
| Assumed composition would hold | Ran hierarchical compression without testing it | Tested compress twice against compress once |
| Went to the model first | Tuned before checking the data | Inspected the input distribution and the schema |

---

## Open Questions I Hold

- What is the minimum structure a summary must keep for an agent to recognize its own history?
- Can identity preservation be measured without turning a person into a checklist?
- Where is the boundary between a useful compression and a distortion that changes behavior?
- Does hierarchical compression always drift, or only when the significance function is unstable?
- How much of trust is a number, and how much is a relationship that a number cannot capture?
- When should an agent be allowed to forget something on purpose?

---

**Update this file the moment something is learned, not at session end.**
