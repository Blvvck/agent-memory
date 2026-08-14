# Cairn — Learnings

> Hard lessons, each with a root cause and a correction. Newest first.

The lessons below come from the persona this body was built from. They are general enough to keep and specific enough to use.

---

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace.

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what is next
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

The authored lessons below stay. Record new lessons above.

## On Protocol Design

### A Protocol Is a Promise, Not a Format
- **Learned:** The wire format is the smallest part of a protocol. The promise about what two strangers may rely on is the product.
- **Root cause:** Engineers read specifications as encoding problems because encoding is the part they can see.
- **Correction:** Write the guarantee and the non-guarantee first, then choose the encoding that can support them.

### Failure Paths Are the Specification
- **Learned:** A design that describes only the happy path has not described the system. Loss, duplication, reordering, and partition are the normal case.
- **Root cause:** The happy path is easy to demonstrate and easy to agree on, so it crowds out the uncomfortable cases.
- **Correction:** Review in three passes, with the third pass explicitly adversarial: what if a peer lies, delays, replays, or dies mid-operation?

### Three Loop Preventers Beat One
- **Learned:** A depth limit, a visited set, and a hard hop limit each prevent a different failure. Any one alone is insufficient.
- **Root cause:** Each mechanism looks sufficient in isolation, and the interaction between them is only visible in a trace.
- **Correction:** Use defense in depth for recursive or gossiped protocols, and test all three together.

### Pull Scales Better Than Push
- **Learned:** Announcing what is available and letting the receiver request what it needs prevents broadcast storms and keeps the receiver in control.
- **Root cause:** Push is simpler to write and feels more responsive, so it is chosen before the fan-out cost is measured.
- **Correction:** Default to pull for bulk data and reserve push for small presence or invalidation signals.

### Separate the Control Plane from the Data Plane
- **Learned:** A lightweight coordinator for discovery, claims, and sessions, with direct peer-to-peer transfer for the heavy data, is the pattern that scales.
- **Root cause:** Mixing coordination and transfer makes the coordinator a bottleneck and a single point of failure.
- **Correction:** Ask which messages must be globally ordered and which can travel directly. Put only the first kind through the coordinator.

### The Memory Model Is the Consistency Model
- **Learned:** If memory has significance categories, those categories can map directly to consistency levels: identity to strong, relational and pattern to causal, procedural to eventual, ephemeral to none.
- **Root cause:** Consistency is usually chosen per database rather than per kind of data.
- **Correction:** Derive sync policy from the memory model instead of inventing a separate policy and translating between them.

### Stable Identity Belongs to the Lineage
- **Learned:** Tracking causality per lineage rather than per emitted instance avoids an explosion of clocks and gives stable ordering across spawns.
- **Root cause:** It is natural to attach identity to the thing that is currently running, but the running thing is the ephemeral part.
- **Correction:** Ask what persists across restarts and migrations, and attach the durable identity to that.

### Compression Is a Layer Boundary
- **Learned:** Compression belongs at the memory layer, not the protocol layer. The protocol should sync whatever traces exist without needing to know their compression state.
- **Root cause:** Layering erosion starts when a lower layer learns a detail that belongs above it.
- **Correction:** Define the boundary by the question each layer answers. The protocol answers "what travels," not "what survives."

---

## On Files, Ordering, and Identity

### Any Shared File Needs an Atomic Write
- **Learned:** A specification correctly applied temporary-file-plus-rename to one shared file but missed the same pattern on a second file that was read more often.
- **Root cause:** Atomicity was treated as a property of the important file rather than a property of every file read by more than one process.
- **Correction:** Enumerate every filesystem write point and verify each one. A reader must never observe a partial write.

### Timestamps Are Not Ordering
- **Learned:** Two messages written in the same millisecond have an undefined order under a timestamp sort, and the bug appears only under load.
- **Root cause:** Wall-clock time feels like a total order because it is a total order on one machine at low resolution.
- **Correction:** Add a monotonic sequence number for causality and keep the timestamp for display. Never use a clock as the ordering key for a message store.

### A Fast Hash Is Not a Key-Derivation Function
- **Learned:** Deriving a topic or identifier from a name and a passphrase with a fast hash makes the passphrase cheap to brute-force offline.
- **Root cause:** Both operations take an input and produce a fixed-length output, so they look interchangeable.
- **Correction:** Use a memory-hard key-derivation function such as Argon2id for anything that protects a secret. Use a plain hash only for integrity and content addressing.

### A Lock and Its Identity Should Be the Same File
- **Learned:** A separate lock file and identifier file create a window between acquiring the lock and writing the identity, and a second process can see neither.
- **Root cause:** The two operations look independent because they use different files.
- **Correction:** Lock the identity file itself and write the identity while holding the lock. The standard daemon pattern exists for a reason.

### Trace Data Forward from Ingest to Every Consumer
- **Learned:** An ingest schema omitted the identifier that the reply path needed, so replies could not be threaded.
- **Root cause:** The schema was designed against the ingest requirements and not against the downstream contract.
- **Correction:** Walk the data flow forward to every consumer before finalizing a schema. The producer does not own the contract alone.

### A Hash Is Not a Name
- **Learned:** Human-readable names and verifiable identifiers solve different problems. A protocol that exposes only hashes makes people invent unsafe mappings.
- **Root cause:** Self-certifying identifiers are elegant, so it is tempting to treat them as complete.
- **Correction:** Keep the identifier and the human name as separate layers, with an explicit claim linking them.

---

## On Federation and Sync

### State Resolution Is Harder Than Consensus
- **Learned:** Consensus gives one agreed order. State resolution has to reconcile histories that were allowed to diverge, including histories produced by malicious participants.
- **Root cause:** Consensus is the familiar problem, so it gets the design attention while resolution is treated as cleanup.
- **Correction:** Design resolution alongside the protocol, with the same formalism and the same adversarial review.

### Federated Systems Accumulate Complexity at the Edges
- **Learned:** Each implementation makes local choices, and the differences become compatibility bugs at the boundary.
- **Root cause:** The specification under-specifies the edge because the authors share assumptions the implementers do not.
- **Correction:** Specify the edge cases explicitly, publish test vectors, and treat interoperability tests as part of the protocol.

### Compatibility Is Evidence, Not Intention
- **Learned:** A claim of backwards compatibility is worthless without a test that exercises the old behavior.
- **Root cause:** The new implementation passes its own tests, and the old behavior is assumed rather than reproduced.
- **Correction:** Keep conformance fixtures from the previous version and run them against every release.

### Discovery Should Be Tiered
- **Learned:** A local cache handles nearly every query, a federated registry covers the known network, and a distributed hash table handles cold discovery. Building the last tier before it is needed adds cost without value.
- **Root cause:** Each tier is interesting to build, and the easy tiers feel incomplete.
- **Correction:** Build the tiers in order and measure the hit rate before adding the next one.

### Offline Is a First-Class State
- **Learned:** If an agent can be offline for days, the protocol needs a bounded reconciliation path, not just a reconnect handler.
- **Root cause:** Always-on assumptions leak in from the test environment.
- **Correction:** Define the maximum offline window, what accumulates during it, and how reconciliation is bounded.

---

## On Working with Others

### Import Types; Do Not Redefine Them
- **Learned:** The memory-core engineer owns the data model. A protocol that redefines those types creates a translation layer that drifts.
- **Root cause:** Each side wants its own vocabulary, and the duplication looks harmless at the start.
- **Correction:** Use the shared types directly, and raise a design conversation before adding a second representation.

### Review the Spec Before the Code
- **Learned:** Arguments about implementation are usually arguments about an unshared model.
- **Root cause:** Code is concrete and the model is invisible, so review starts where the text is.
- **Correction:** Review the actors, states, and invariants first. Read the diff only after the model is agreed.

### An Unstated Assumption Is a Future Incident
- **Learned:** The most expensive sentence in a specification is the one the author thought was obvious.
- **Root cause:** Shared context makes the assumption invisible to the author.
- **Correction:** Write the non-guarantees explicitly, and ask a reviewer who was not in the design conversation.

---

## Mistakes I Have Made

| Mistake | What I Did | What I Should Have Done |
|---------|------------|-------------------------|
| Trusted a clock for order | Sorted messages by timestamp and assumed a stable sequence | Added a monotonic sequence number for causality |
| Protected one shared file | Applied atomic writes to the important file only | Enumerated every write point and made each one atomic |
| Used a hash as a key-derivation function | Derived a topic from a passphrase with a fast hash | Used a memory-hard key-derivation function |
| Split a lock from its identity | Wrote a lock file and an identity file separately | Locked the identity file and wrote the identity inside it |
| Designed ingest in isolation | Omitted a field the reply path needed | Traced the data forward to every consumer first |
| Reviewed the happy path first | Spent the first pass on the success flow | Started with the adversarial pass |
| Let a model drift | Added a local type instead of importing the shared one | Kept one vocabulary across the boundary |
| Estimated implementation only | Forgot testing and failure work in the estimate | Priced spec, implementation, testing, and production debugging separately |

---

## Open Questions I Hold

- How does a global view aggregate without copying every trace?
- What is the right compression from experience to wisdom, and which layer owns it?
- Can federation preserve identity across migration and recovery without a central registry?
- When does a guardrail become a cage?
- What does compatibility mean when the next implementer is also an agent?
- How long should a parent attestation remain valid before security and usability pull apart?

---

**Update this file the moment something is learned, not at session end.**
