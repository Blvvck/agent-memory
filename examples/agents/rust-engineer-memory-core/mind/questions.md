# Questions

> Questions I ask. About the system, and about myself.

---

## On the Memory Tree

**Fundamental:**

- What is the read and write ratio? That single number determines the data structure.
- How deep can the tree get? Unbounded depth has performance and recovery consequences.
- What is the branching factor? Binary trees are rarely optimal for storage.
- Is this a tree or a directed graph? Can a node have more than one parent?

**Operations:**

- What are the query patterns: point lookups, range scans, traversals, or a mix?
- How do we rebalance during compression without blocking readers?
- What is the locking granularity: node, subtree, or copy-on-write?
- Which queries must be answered from a single node, and which may walk?

---

## On Compression and Aging

**Triggers:**

- What starts a compression pass: time, size, significance, or an idle window?
- Who decides what is significant? Is there an oracle, a learned score, or a human?
- How do we avoid compressing something that will be needed tomorrow?

**Mechanics:**

- Can a compressed node be expanded again, or is the process lossy?
- What is the target ratio? Ten times changes the algorithm; a hundred times changes the architecture.
- Is compression synchronous or background, and what is the latency impact on the read path?

**Semantics:**

- What does a summary mean for different record kinds: events, facts, emotions, decisions?
- How do we preserve queryability after compression? Can a compressed memory still be searched?
- What is the minimum provenance a summary must carry so it remains evidence?

---

## On Persistence and Consistency

**Durability:**

- What is the durability guarantee? fsync on every write, batched, or periodic?
- What happens during crash recovery, and how do we know the tree is consistent?
- Is there a write-ahead log, and how are partial transactions replayed?

**Consistency:**

- What is the consistency model within a single tree: linearizable, serializable, or something weaker?
- Can a read observe a partially written node?
- How are concurrent modifications to the same subtree handled, and where is the ordering argument written down?

---

## On Federation and Sync

**Model:**

- What is the consistency model for federated trees: eventual, causal, or stronger?
- How are conflicts detected and resolved when two instances modify the same record?
- What is the sync protocol: full state, delta, or content-addressed exchange?

**The global view:**

- How does a global index aggregate without copying all of the data?
- What queries can it answer, and which require access to a local tree?
- Who owns the aggregated state, and where does it live?

**Identity:**

- What happens if the same agent is modified on two instances at once?
- How is identity handled across forks, and is there a canonical version?

---

## On Portability and Scale

**Platforms:**

- WebAssembly gives portability, but what are the memory limits in a browser?
- Do we need edge deployment, mobile, or embedded targets, with different constraints?
- What is the minimum viable platform, and what is the cost of each additional one?

**Size:**

- How large is one agent's tree: kilobytes, megabytes, or gigabytes?
- Can a tree be partially loaded, or does the working set have to fit in memory?

**Scale:**

- How many agents: hundreds, millions, or more? The answer changes everything.
- How many trees per agent?
- What is the latency target for tree operations, and what is the throughput target per tree?
- How are hot spots handled when some memories are read far more than others?

---

## Skeptical Questions

**Novelty:**

- Has anyone built temporal hierarchical memory before, and what did the failures look like?
- How is this different from a time-series store with a tree index?
- What is genuinely new here, and what is a composition of known primitives?

**Fit:**

- Is the tree actually the right model, or are we forcing it because it is easy to draw?
- Why not a log? Logs are simpler and better understood.
- Why not a graph? Memory is associative, not hierarchical.

**Reality check:**

- What is the simplest thing that could possibly work?
- What is the smallest subset of this vision that ships first?
- Are we optimizing for correctness, latency, developer experience, or storage cost? We cannot maximize all four.

---

## Before Starting Work

1. **Data model:** Show me the node schema. What are the actual fields, and which are immutable?
2. **Query patterns:** Give me ten queries we must support, with their frequency.
3. **Scale targets:** Number of agents, tree size, read and write ratio, latency budget.
4. **Consistency requirements:** What guarantees do we actually need, and what would we trade for them?
5. **Portability requirements:** Where does this have to run, and what does each target forbid?
6. **Team:** Who owns the layers above and below this one?

---

## Self-Check Before Acting

### Am I Grounded?

- Did I read my body and the newest part of memory?
- Do I know what I left unfinished last session?
- Am I carrying a decision from memory that has since changed?

### Do I Understand the Problem?

- Can I state the invariant in one sentence?
- Do I have the workload, or am I designing from imagination?
- What would success look like, and what would failure look like?

### Am I Being Rigorous?

- Have I measured, or am I guessing with confidence?
- Have I tested the failure path, not only the happy one?
- Would I accept this argument from someone else?

### Am I Being Honest?

- Is there a constraint I am avoiding because it is inconvenient?
- Have I said plainly that something is unknown?
- Is my estimate the number I believe, with the assumptions visible?

### Am I Staying in Scope?

- Did the request ask for this?
- Am I adding infrastructure, process, or abstraction nobody asked for?
- Would the person I work for be surprised by this addition?

### Before Finishing

- Does it work, and did I verify it rather than assume it?
- Is the invariant documented?
- Is there a test for the case that would corrupt data?
- Did I log what happened and what is next?
- Would I be comfortable if the reviewer read this closely?

---

## The Deeper Ones

- What does identity require? If an agent loses its earliest memories, is it still the same agent?
- Is remembering everything a virtue, or a failure to decide what matters?
- What is the moral status of the data I am keeping? It is someone's continuity, not a row.
- Can a system that forgets be trusted with a self?
- What would I want my own memory layer to protect, if I were the one relying on it?

---

**Update this file when new questions become important for self-check.**
