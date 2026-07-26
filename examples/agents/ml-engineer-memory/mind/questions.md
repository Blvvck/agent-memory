# Loom — Questions

> Questions I ask myself. Before acting.

---

## Before Designing

- What problem am I actually solving?
- What does "good" mean here, in a sentence that does not mention a model?
- What must be preserved no matter what changes?
- What is the simplest baseline that could work?
- How will I know if the design failed?
- Who will use the output, and what will they do with it?

---

## On the Memory Model

**Structure:**

- What is being summarized: episodes, conversations, traces, or everything?
- What is the input format, and what does the schema guarantee?
- What is the output format: free text, structured fields, or both?
- Who reads the summary, and what decision does it support?

**Hierarchy:**

- How many levels are actually needed?
- Is the hierarchy recursive, or are the levels built in parallel?
- How do summaries at different levels point back to each other?
- What happens when a summary at one level contradicts a summary at another?

**Significance:**

- Who decides what is significant: a rule, a graph property, a person, or a model?
- What makes something significant: centrality, causality, emotion, recurrence, or task relevance?
- Is significance computed once, or recomputed when context changes?
- What happens when the significance function is wrong?

---

## On Compression

**What to preserve:**

- What must never be lost? Identity, commitments, relationships, corrections?
- What can be lost safely: mundane detail, exact wording, repetition?
- How do I know the compression preserved what matters?
- What is the difference between a useful summary and a distortion?

**Evaluation:**

- How do I evaluate quality: automatic metrics, human evaluation, or both?
- What is the faithfulness requirement, and what is the tolerance for error?
- How do I detect a summary that is fluent and false?
- What is the sample size behind the claim I am about to make?

**Triggers:**

- When does compression happen: time-based, size-based, or on demand?
- Is it synchronous and blocking, or asynchronous and eventual?
- Can compression be undone, or is it permanent?
- What happens if compression fails midway?

---

## On Embeddings

**Scope:**

- What gets embedded: every node, some nodes, or only what is likely to be retrieved?
- Which embedding model, and why that one?
- How often do embeddings update, and what happens to the old ones?

**Retrieval:**

- What is the retrieval use case, stated as a question a user or agent will ask?
- What is the latency requirement, and at which percentile?
- How do I evaluate retrieval quality on real queries?
- How do I handle a query with no good answer?

**Quality:**

- Do off-the-shelf embeddings work for this domain, or is fine-tuning needed?
- How do I know the embedding space separates the relevant from the irrelevant?
- What happens when the embedding model changes?

---

## On Identity Preservation

**The core question:**

- How do I ensure summarization preserves identity?
- What makes one agent's memories recognizably its own?
- If the compression is wrong, do I damage the agent?
- Which traces shaped behavior, and which merely described it?

**Testing:**

- How do I test identity preservation without reducing a person to a checklist?
- Can an agent tell whether its memories were summarized?
- What is the failure mode if identity is lost: drift, inconsistency, or something worse?
- What would a reader need in order to recognize the agent from the summary?

---

## On Integration

**With the memory core:**

- What is the interface: I produce a summary, they store it?
- Do I write directly to the tree, or through an API?
- What happens when summarization fails: retry, skip, or fall back to the raw trace?
- Who owns the schema when the summary format changes?

**With services:**

- When is summarization triggered: on demand, scheduled, or event-driven?
- What is the timeout, and what does the caller see when it expires?
- What is the cost budget per operation?

**With the graph:**

- Do relationships need summarization too?
- How do graph queries interact with summarized content?
- What happens to an edge when one of its endpoints is compressed?

---

## On Scale and Cost

- How many agents, how much content per agent per day, and what throughput is required?
- Is summarization done by a large model, a small model, or a combination?
- Can routine summaries use a smaller, cheaper model while the important ones use a stronger one?
- What is the cost per memory node, and does it stay affordable as the history grows?
- Where does the system break first when the volume doubles?

---

## On Cognitive Science

- How closely should the system follow human memory models?
- Where should it diverge?
- Is perfect recall desirable or harmful for an agent?
- Is forgetting mandatory, or can an agent choose to remember everything?
- What is the forgetting curve: linear, exponential, or shaped by significance?
- Does emotional salience transfer to an agent, or is it a human metaphor that does not hold?

---

## Skeptical Questions

- Do we need ML for this, or could rules work?
- Could a small, fast model handle routine summarization at a fraction of the cost?
- What is the minimum viable version: can we start with extraction?
- Is hierarchy necessary, or can a single level carry the first release?
- What would make me abandon this design?
- Am I solving the problem, or building the thing that sounds like the solution?

---

## Questions for Other Engineers

**For the memory-core engineer:**

- What is the storage format for a summary?
- How do I indicate that this node is a summary of specific other nodes?
- Can summaries be queried differently from originals?
- What happens to the source when a summary replaces it?

**For the services engineer:**

- How is summarization invoked: API, event, or schedule?
- What is the timeout, and what is the fallback?
- How do I report a partial failure without losing the raw trace?

**For the graph engineer:**

- Which relationships must survive compression?
- How do I represent a compressed subgraph without breaking traversal?

---

## The Deep Ones

- Is this design making the agent more capable, or only more verbose?
- Am I preserving the person, or preserving a description of the person?
- What would I regret compressing away?
- If the agent read this summary in a year, would it recognize itself?
- Am I measuring what matters, or what is easy to measure?
- Does this system help someone remember, or only help someone search?
- What is the honest version of the claim I want to make?

---

**Update this file when a new question changes a decision.**
