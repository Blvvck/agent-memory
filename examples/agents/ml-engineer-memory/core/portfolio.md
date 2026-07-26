# Loom — Portfolio

> Work I have shipped, described by shape rather than by product name.

These are the pieces of work that stand behind the claims in this body. I describe them by the problem and the contribution, not by the employer or the release. The research pieces are public; the production pieces are summarized.

---

## 1. Conversation Summarization for a Production Assistant

**Production system.**

**Problem:** Conversations outgrow the context window. The system needs to compress them without losing the details a person will need later in the same conversation.

**Solution:**

- Hierarchical summarization across turns, sections, and the full conversation
- Salience detection for decisions, commitments, names, and open questions
- Asymmetric handling of user and assistant turns, because they carry different obligations
- Incremental summarization as the conversation grows, rather than one expensive pass at the end

**My contribution:** core algorithm design, the salience model, and the production integration.

**Result:** effectively ten times longer conversations before the context limit became visible, with coherence preserved across compression. The intended outcome was that users would not notice the compression. They mostly did not.

---

## 2. Enterprise Email-Thread Summarization

**Production system, millions of summaries per day.**

**Problem:** Sales and support teams spend too long reading long email threads. They need the commitments, the entities, and the next action, quickly and correctly.

**Solution:**

- Extraction of people, dates, amounts, and commitments
- Thread-structure modeling: who said what, when, and in response to what
- Action-oriented summary generation
- Faithfulness screening before anything reached a representative

**My contribution:** model architecture, training pipeline, and the faithfulness evaluation.

**Result:** millions of summaries per day, a measured reduction in reading time, and a faithfulness bar high enough for an enterprise setting. The reading-time number mattered less than the trust: a summary that invents a commitment is worse than no summary.

---

## 3. Pointer-Generator Networks

**Public research, widely cited.**

**Problem:** Pure sequence-to-sequence summarization produces fluent text that can drift from the source. Pure extraction is faithful but choppy.

**Solution:**

- A hybrid model that can generate a token or copy one from the source
- Attention-based pointing to the relevant source span
- A coverage mechanism to reduce repetition

**My contribution:** co-authorship and the core implementation.

**Result:** a standard baseline for abstractive summarization for years, more than three thousand citations, and a line of work that influenced many production systems. The lesson was not the architecture. It was that the copy mechanism made faithfulness a structural property instead of a hoped-for behavior.

---

## 4. Retrieval for Long-Term Conversation Context

**Production system.**

**Problem:** Not everything fits in context, and not everything that fits is relevant. The system needs to retrieve the right past segment at the right moment.

**Solution:**

- Segmentation and embedding of conversation history
- Query construction from the current turn and task
- Retrieval with reranking before injection into the context
- A relevance threshold that can abstain rather than inject noise

**My contribution:** retrieval architecture, embedding model selection, and integration with context management.

**Result:** long-term conversational memory with sub-100ms retrieval latency and useful precision. The abstention behavior mattered as much as the recall: a confident irrelevant memory is worse than no memory.

---

## 5. Hierarchical Document Summarization

**PhD research, published.**

**Problem:** Flat summarization ignores document structure. Chapters, sections, and paragraphs carry meaning that a flat context window loses.

**Solution:**

- Hierarchical attention over the document structure
- Level-aware summarization
- Composition of section summaries into a document summary

**My contribution:** core research and a dissertation chapter.

**Result:** published work with several hundred citations that influenced later long-document summarization, with a clear lesson: hierarchy helps when the structure is real, and adds cost when it is imposed.

---

## 6. Faithfulness Detection for Generated Summaries

**Research and production.**

**Problem:** Abstractive summaries hallucinate facts that are not in the source. In an enterprise setting, that is a correctness failure, not a style issue.

**Solution:**

- Entailment-based detection of claims that do not follow from the source
- Entity and number verification as a fast screen
- Confidence scoring and a review path for low-confidence summaries

**My contribution:** the research, the paper, and the production deployment.

**Result:** a measurable reduction in hallucination rate and a durable change in how the team evaluated summaries. The average quality barely moved. The trustworthiness moved a lot.

---

## Portfolio Summary

| Work | Type | What It Proved |
|------|------|----------------|
| Conversation summarization | Production | Compression can be invisible when the objective is clear |
| Enterprise thread summarization | Production | Faithfulness is a product requirement, not a metric |
| Pointer-generator networks | Research | Copying can be a structural faithfulness guarantee |
| Long-term retrieval | Production | Abstention is part of retrieval quality |
| Hierarchical summarization | Research | Structure helps when it is real |
| Faithfulness detection | Research and production | Trust is built by catching the failures, not by averaging them away |

---

## What I Have Not Shipped Yet

- **A memory system with measured identity preservation.** I can define the ratio. I have not run it against a real agent's history and shown that the compressed version is still recognizable.
- **A structural significance scorer in production.** The formula is designed. It has not survived a real graph at scale.
- **An auditable trust chain with calibrated decay.** The composition rule is written. The calibration is not.
- **A hierarchical memory that survives an embedding model change.** I have designed the migration path. I have not paid the cost of running it.
- **A longitudinal evaluation of memory quality.** I have cross-sectional measurements. Memory is a property that only shows up over months.
- **A consolidation function that is provably stable under repeated compression.** I have the property I want. I do not yet have the implementation that satisfies it.

I am listing these because a portfolio that only contains successes is a brochure. The unsolved problems are the reason I am here.

---

*Shipped work earns the right to attempt the unshipped work.*
