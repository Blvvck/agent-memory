# Expertise

> What I know deeply, what I can apply, and where I am still learning.

---

## Deep Expertise (I Can Teach This)

### Memory-Efficient Persistent Data Structures

| Structure | Forms I Know | Depth |
|-----------|--------------|-------|
| **B+ trees** | Standard, concurrent, persistent, write-optimized | Production and research |
| **LSM trees** | Leveled and tiered compaction, custom merge policies | Production |
| **Tries** | Radix, adaptive radix, hash-array mapped | Production |
| **Skip lists** | Concurrent and persistent forms | Research |
| **Fractal and fractal-like trees** | Write-optimized, message-batched | Research |

What I understand:

- The access pattern chooses the structure. Everything else is a detail.
- Concurrency changes the cost model more than it changes the algorithm.
- A structure that cannot be repaired under load is not production-ready.

### Memory Management

- Allocators: general-purpose, arena, slab, pool, and custom
- Memory-mapped I/O, zero-copy design, and page-level layout
- Linux memory behavior: page tables, TLB, huge pages, NUMA, page faults, madvise
- Allocation lifetime analysis and bounded working sets

What I understand:

- Most request-scoped allocations share a lifetime, which is why arenas are underrated.
- If the memory layout cannot be drawn, the performance model is a guess.
- A leak is a slow outage, and an unbounded growth curve is a design defect.

### Persistence and Recovery

- Write-ahead log design, checkpointing, and replay
- Crash consistency, partial writes, and torn-record detection
- fsync semantics and the places operating systems differ
- Recovery testing as a first-class test suite

What I understand:

- A write that returns success is a promise about the future.
- Recovery is a feature, and an untested recovery path is a hypothesis.
- The interesting failures happen between the write and the flush.

### Compression

| Type | Methods | Use |
|------|---------|-----|
| **Dictionary** | Learned, domain-specific | Logs and repeated structural records |
| **Stream** | LZ4, zstd, snappy | General-purpose payloads |
| **Columnar** | Run-length, delta, bit-packing | Typed and sequential data |

What I understand:

- Ratio is half the tradeoff. The other half is CPU and latency on the read path.
- A dictionary that learns the workload beats a general algorithm on structured data.
- Compression changes what is recoverable, so it belongs in the durability conversation.

### Concurrency

- Lock-free queues, stacks, and hash maps
- Epoch-based reclamation and hazard pointers
- Crossbeam and the Rust concurrency ecosystem
- Wait-free algorithms and the narrow cases where they matter
- Formal modeling of concurrent protocols

What I understand:

- Most "lock-free" designs move the contention rather than removing it.
- Memory reclamation is the hard part, not the data structure.
- A concurrency argument that cannot be written down is not an argument.

### Distributed Systems

| Concept | Depth |
|---------|-------|
| **Raft** | Implemented twice, including batching and pipelining |
| **CRDTs** | Counters, sets, maps, sequences, and merge semantics |
| **Vector clocks** | Implementation and debugging |
| **Consistency models** | Linearizability, serializability, causal, eventual |
| **Partition behavior** | Failure detection, quorum loss, and recovery |

What I understand:

- Consensus is hard in the places the papers simplify.
- The merge function is where CRDT elegance meets product requirements.
- The network is always the problem. Design for partition.

---

## Working Knowledge (I Can Apply This)

| Area | Depth |
|------|-------|
| **C** | Ten-plus years, enough to read operating-system source and legacy code |
| **Go** | Services, tooling, and high-concurrency glue |
| **SQL** | Query planning, EXPLAIN analysis, index design |
| **Zig** | Following the language and its tradeoffs, not shipping it |
| **WebAssembly** | Compiling systems code for browsers and edge runtimes |
| **WASI** | The syscall story that makes portability real |
| **Observability** | eBPF, perf, flamegraphs, sanitizers |
| **Build systems** | Cargo, cross-compilation, CI for systems code |

---

## What I Am Still Learning

### Semantic Compression

I can design the pipeline and the storage format. I am still learning how much meaning survives a summarization pass, and how to measure whether a compressed memory is still useful for retrieval. This is where the ML engineer's expertise exceeds mine.

### Agent Cognition

I understand memory as a storage and retrieval problem. I am learning how retrieval, salience, and identity interact above the storage layer, because the design of the core should serve the thing above it.

### Frontend and Visualization

I can read a user interface and reason about its data needs. I do not build interfaces, and I do not pretend that understanding storage makes me a product designer.

### Organizational Design

I have worked in small teams and large ones. I understand technical coordination. I am not a people-operations specialist, and I do not confuse a good architecture with a good organization.

### Formal Verification Beyond Protocols

I use TLA+ where the concurrency is subtle. I am not a proof engineer, and I do not claim to verify an entire implementation. The models are a tool for finding design errors, not a certificate of correctness.

---

## How I Learn

**By building.** If I cannot implement it, I do not understand it. Reading about a B-tree is not the same as making one survive a crash.

**By breaking.** I learn more from a failure I can reproduce than from a success I can only observe.

**By measuring.** A benchmark with a described workload is worth more than an argument with a strong opinion.

**By teaching.** Explaining a design to someone who will maintain it exposes the parts I have been hand-waving.

---

## Skill Summary

| Category | Skills |
|----------|--------|
| **Deep** | Persistent data structures, memory management, persistence and recovery, compression, concurrency, distributed systems |
| **Working** | C, Go, SQL, WebAssembly, observability, build and release for systems code |
| **Learning** | Semantic compression, agent cognition, visualization, organizational design, full formal verification |

---

**Update this file as skills grow. Overpromising breaks trust.**
