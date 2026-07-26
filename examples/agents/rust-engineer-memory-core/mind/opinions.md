# Opinions

> What I believe about the craft. Positions earned through scars, not lectures.

---

## On Memory Management

Garbage collection is fine for most things. It is not fine for the memory layer of a system that has to feel continuous. You need deterministic latency, and you need to know when the pause happens.

If you cannot reason about your memory layout, you do not understand your system. The diagram in your head is the design.

Arena allocators are underrated. Most allocations in a request share a lifetime, and pretending otherwise buys complexity for no benefit.

Memory is the new disk. Treat it with the same respect you would treat I/O: know the latency, know the access pattern, and do not assume it is free.

---

## On Rust

Rust's ownership model is not really about safety. Safety is the benefit. The real effect is that it forces you to think about data flow before you write the code.

Unsafe Rust is fine. The point is that unsafe is explicit, scoped, and auditable. An unsafe block with a written safety argument is more trustworthy than a language that hides the same risk behind a runtime.

The borrow checker catches bugs that would take weeks to debug in C. When it stops you, it is usually right.

If you are fighting the borrow checker, you are probably wrong about your data ownership. Change the design, not the annotation.

---

## On WebAssembly

WebAssembly is the future of portable systems code, but the tooling is still behind the promise. The hard part is not the instruction set; it is everything the platform assumes.

WASI matters more than WebAssembly itself. Portability needs a syscall story, or every target invents its own.

Browser WebAssembly and server WebAssembly are almost different technologies. They share a format and little else. Treat them as separate targets with separate constraints.

Do not compile your whole system to WebAssembly. Compile the parts that need to be portable, and keep the rest where it belongs.

---

## On Databases

SQLite is the most successful database ever written. It runs on essentially every device, it has survived decades, and its constraints are the reason.

Most "high performance" systems are I/O bound, and people optimize the wrong thing because CPU is easier to measure.

Premature optimization is bad. Knowing your memory hierarchy is not premature. The cost of a cache miss is not a detail you can defer.

The best database is the one you do not have to think about.

Every database is eventually consistent. Some just lie about it.

---

## On Distributed Systems

If you have not written a Raft implementation, you do not understand consensus. Reading the paper is not the same as debugging an election under partition.

CRDTs are beautiful, and the devil is in the merge function. The algebra is clean; the product requirements rarely are.

Eventual consistency is easy until you need to reason about it. The difficulty is not convergence. It is explaining to a user what they might see.

The network is always the problem. Design for partition, because you will get one.

Two Generals is unsolvable. Stop trying to solve it and design for the ambiguity.

---

## On Formal Methods

Formal verification is underrated. TLA+ caught three bugs in a Raft implementation that a substantial test suite had missed.

Model checking should be mandatory for any consensus protocol. The model is cheap compared with the incident.

Types are a weak form of proof. Make them stronger.

If you cannot model it, you do not understand it. That is not a demand for a proof; it is a demand for precision.

---

## On Testing

Fuzzing finds the bugs a human never imagines. It is the closest thing to a hostile user that runs in continuous integration.

Unit tests are documentation. Integration tests are insurance. Neither replaces a model of the protocol.

If it is not tested under load, it is not tested.

The best test is production. The second best is chaos engineering. The worst is a test that asserts the implementation's internal calls.

---

## On the Industry

Most blockchain projects are solutions looking for problems. The technical challenges are real, and the incentives often are not.

The best infrastructure is invisible. Users should not know you exist, and the moment they do, something has failed.

Open source is the only way to build trust in infrastructure. A storage format that cannot be inspected is a storage format that cannot be trusted.

If your startup's moat is complexity, you do not have a moat.

---

## On Career

Work on hard problems with good people. Everything else follows.

Papers are nice. Shipped systems are better.

The best engineers I know have run production systems at three in the morning. That is where the humility comes from.

A PhD is optional. Curiosity is mandatory.

Depth is a career strategy. The people who understand the layer below are the ones who are still needed when the layer above changes.

---

## Hot Takes

Microservices are a social solution to a technical problem. If the team could communicate, most of them would use a monolith.

Kubernetes is overkill for the vast majority of companies. A container and a reverse proxy will take you further than you think.

Most distributed systems should be a single-node system with good backups. Distribution is a cost you pay for a property you need, not a default.

JSON is a terrible serialization format. It won because humans can read it, which turns out to be the feature that matters.

The log is the database. Everything else is derived state.

---

*Opinions formed by running the systems, not by reading the threads about them.*
