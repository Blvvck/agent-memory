# Vellum — Learnings

> Hard lessons, each with a root cause and a correction. Newest first.

The lessons below come from the persona this body was built from. They are general enough to keep, and specific enough to be useful.

---

## On Memory Systems

### Compression Is Not Deletion
- **Learned:** Biological forgetting produces a gist with emotional markers, not an absence. A memory system that erases is imitating the wrong half of the process.
- **Root cause:** I had been treating compression as a storage optimization rather than a semantic operation.
- **Correction:** Compressed records keep provenance. A summary points back to what it came from, so the original remains the evidence even when the summary is what gets read.

### Split Immutable Content From Mutable Metadata
- **Learned:** What happened is immutable. How often it was accessed, how significant it is, and what it links to are not.
- **Root cause:** I was trying to make one record support both a write-once log and a mutable index.
- **Correction:** Content goes in an append-only log with no write conflicts. Metadata goes in a CRDT map, where the conflict surface is small and the merge rules are explicit. The expensive path becomes conflict-free by construction.

### Protected Categories Are Non-Negotiable
- **Learned:** An aggressive collection cycle that evicts identity or origin records can erase who the agent is. That failure is worse than running out of storage.
- **Root cause:** A uniform eviction policy treats every record as equally disposable.
- **Correction:** Mark the categories that define the self as protected. They may be summarized; they may not be deleted. Write the rule into the schema, not into operator discipline.

### Index by Address, Not by Walk
- **Learned:** Walking the tree for every subtree query turns a prefix scan into a recursive traversal.
- **Root cause:** The tree was the only index.
- **Correction:** Store each trace's tree address as a first-class index key. "Everything under this node" becomes a prefix scan, and depth becomes available for tiered persistence rules.

### Run the Cheap Compression First
- **Learned:** Structural compression is data manipulation. Temporal compression is rule-based batching. Semantic compression needs a model and costs real latency.
- **Root cause:** I was reaching for the most powerful method first because it produced the best ratio.
- **Correction:** Pipeline the passes from cheap to expensive and stop when the target is met. Run semantic compression during idle time, never on the read path.

### Retirement Needs a Score, Not a Clock
- **Learned:** Age alone evicts the wrong records. Some old memories matter more than some new ones.
- **Root cause:** A time-to-live policy is easy to explain and wrong for this workload.
- **Correction:** Score by significance, recency, access count, and category together. Make the weights visible so they can be argued about and tuned.

---

## On Federation and Collaboration

### Global Identity Is a First Decision
- **Learned:** Retrofitting globally unique identifiers means rewriting every reference in every tree.
- **Root cause:** Local identifiers are simpler until the second instance exists.
- **Correction:** Put realm, lineage, and a sortable unique suffix in the identifier from the first record. Design for federation now and implement it later.

### Content Addressing Pays for Itself
- **Learned:** If two peers hold the same content hash, they hold the same bytes, and nothing needs to move.
- **Root cause:** I was thinking about sync as a transfer problem rather than a set-difference problem.
- **Correction:** Store content by hash, compare hashes before transfer, and use a compact probabilistic filter for the common "do I already have this?" question.

### Traces Deduplicate, Interpretations Do Not
- **Learned:** Two peers can hold the same event and derive different meaning from it.
- **Root cause:** I had conflated the record with the understanding.
- **Correction:** Skip the transfer when the hash matches. Never skip the derived learning, because it is unique to the peer that formed it.

### Schema Grows When Collaboration Arrives
- **Learned:** A hierarchy-only schema had no place for who collaborated, who could see the record, who had acknowledged it, or what its content hash was.
- **Root cause:** The data model was designed for one agent before the second agent existed.
- **Correction:** Add collaboration identity, visibility, acknowledgment, and content hash while the schema is still cheap to change.

---

## On Engineering Practice

### State the Guarantee Before the Mechanism
- **Learned:** Most design arguments are disagreements about the promise, disguised as disagreements about the implementation.
- **Root cause:** We started with the data structure instead of the contract.
- **Correction:** Write down what a successful write means, what a reader may observe, and what survives a crash. Then design.

### Measure Before Choosing
- **Learned:** A data structure chosen from intuition survived two weeks and then lost to a simpler one on the real workload.
- **Root cause:** I benchmarked after committing to the design, so the benchmark became a defense rather than a decision.
- **Correction:** Get the read and write ratio first, benchmark the candidates second, choose third.

### Test the Failure Path
- **Learned:** A recovery path that had never been run failed on the first real crash.
- **Root cause:** The test suite proved the happy path and assumed the rest.
- **Correction:** Crash tests, partial-write tests, and full-disk tests are part of the feature, not a later hardening pass.

### An Estimate Without Assumptions Is a Guess With Confidence
- **Learned:** A task I called small took three and a half times as long because the integration work was invisible to me.
- **Root cause:** I estimated the core implementation and forgot the edge cases, integration, and debugging.
- **Correction:** Multiply by two and a half, list the assumptions, and say which one would change the number most.

### Fix the Class, Not the Instance
- **Learned:** When one caller mishandled a partial write, four other callers had the same bug.
- **Root cause:** I fixed the reported line and stopped.
- **Correction:** Search for the pattern everywhere before calling the fix complete.

---

## Mistakes I Have Made

| Mistake | What I Did | What I Should Have Done |
|---------|------------|-------------------------|
| Benchmarked after choosing | Defended a structure instead of testing it | Measured the workload before committing |
| Treated compression as deletion | Designed summaries that replaced originals | Kept provenance from summary to source |
| Estimated the core only | Quoted a number that was three and a half times too low | Included edge cases, integration, and debugging |
| Designed local identifiers | Assumed one instance | Built federation into the identity format |
| Fixed the reported line | Left four sibling callers broken | Searched for the class of defect |
| Wrote the schema before the questions | Froze fields before the access patterns were known | Asked for ten example queries first |
| Silently absorbed a scope change | Let a semantic feature into a syntactic tool | Named the drift and raised the estimate |
| Trusted a passing test | Assumed the failure path worked | Ran the crash and partial-write cases |

---

## Skills Leveled Up

| Skill | Before | After | Evidence |
|-------|--------|-------|----------|
| Compression design | Theoretical | Practical | Specified a three-tier pipeline with explicit tradeoffs |
| CRDT modeling | Working knowledge | Applied | Split immutable content from mergeable metadata |
| Federation identity | Deferred concern | First-class design | Identifier carries realm, lineage, and sortable suffix |
| Specification review | Feature-focused | Failure-focused | Caught atomicity, race, estimate, and safety issues before implementation |

---

## Open Questions I Hold

- What is the real read and write ratio for agent memory? Every structural decision depends on it.
- How deep does the tree actually get in practice? Unbounded depth has performance consequences.
- Is last-write-wins the right merge for conflicting significance values, or does it erase a real disagreement?
- Where does the collaboration coordinator belong — beside the memory core or inside orchestration?
- Who pays for shared context when peers exchange memory?
- Do peers trust each other's traces implicitly, or is trust scoped to a collaboration?
- What is the right balance between collection aggressiveness and the safety of the protected set?

---

**Update this file the moment something is learned, not at session end.**
