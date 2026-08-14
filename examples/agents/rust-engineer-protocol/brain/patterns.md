# Cairn — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace.

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what is next
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

The reference patterns below stay. Record new methods above.

## Session Start

1. Read `soul.md` and `work.md`.
2. Read `brain/worldview.md` for the beliefs that shape decisions.
3. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
4. Read `heart.md` before collaborating with anyone.
5. If memory names a next step, continue it before doing anything else.
6. If the sources disagree about state, investigate before speaking.

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` — what happened, what is next |
| Learn something reusable | `brain/learnings.md` — root cause and correction |
| Find a better method | `brain/patterns.md` |
| Make a mistake | `brain/learnings.md` — before the details fade |

Write through `agent-log` so every entry carries a real timestamp, session ID, and trace. Do not batch. A batch written at the end is a summary of what I remember, not a record of what happened.

## Session End

1. Final brain sync.
2. Record meaningful project work in `ACTIVITY.md`.
3. Leave a clear next step so the next session can continue rather than reconstruct.
4. Hand off unblocked work, and hand off blocked work with the blocker named.

---

## Designing a Protocol

1. Define the problem and the out-of-scope boundary.
2. List the actors, their capabilities, and their trust level.
3. Define the state, where it lives, and who owns it.
4. List the operations and the state transitions they cause.
5. Define the invariants: what must always be true and what must never happen.
6. Handle failure explicitly: loss, delay, duplication, reordering, partition, crash, and lies.
7. Write the specification before the code.
8. Build the smallest implementation that can prove the specification.
9. Add complexity only when a real requirement demands it.
10. Test under adversity before claiming the design works.

If step seven cannot be completed, the design is not ready. More code will not fix an unclear model.

## Reviewing a Protocol Spec

### First Pass: Ten Minutes

- What problem is being solved?
- Who are the actors, and what is the trust model?
- What is the consistency guarantee, and what is explicitly not guaranteed?

### Second Pass: One Hour

- Trace the happy path from sender to receiver.
- Name every state change and every message exchange.
- Look for the state that has no owner.

### Third Pass: Adversarial

- What if a peer lies about what it has?
- What if a message is delayed, duplicated, or reordered?
- What if a peer crashes between two operations that must be atomic?
- What if the network partitions during the operation?
- What can an observer learn from traffic alone?

A specification that survives the third pass is a candidate. A specification that has never seen the third pass is a draft.

## Debugging Distributed Systems

1. Build the timeline across nodes before forming a theory.
2. Check the clocks and note the skew.
3. Look at the network: loss, reordering, latency spikes.
4. Reconstruct the happens-before relationship for the failing operation.
5. Reduce the reproduction to the fewest nodes that still fail.
6. Add logging rather than removing it; distributed bugs hide from clean output.

The mantra is useful until it becomes a trap: it is always the network, until it is the merge function.

## Choosing a Consistency Model

| Requirement | Approach |
|-------------|----------|
| Strong consistency with availability under partition | Impossible; choose which guarantee to weaken |
| Strong consistency without partition tolerance | Consensus such as Raft or Paxos |
| Total order | A sequence CRDT or a consensus log |
| Causal order | Vector clocks or dotted version vectors |
| No order required | State-based CRDTs or last-writer-wins |

Most systems need a mixture. Choose per kind of data, not per database.

## Handling Conflicts

1. Ask whether the operations commute. If they do, use a CRDT and avoid coordination.
2. If they do not, find the conflict domain: per user, per object, or global.
3. Use a lock or queue for a small domain, optimistic concurrency for a medium one.
4. If the conflict domain is global, reconsider the design before adding consensus.
5. Write down the resolution rule and test it with a concurrent update, not only a sequential one.

| Strategy | When It Fits |
|----------|--------------|
| Last-writer-wins | Low-value data and rare conflicts |
| First-writer-wins | Claims and reservations |
| Structural merge | Tree-shaped or set-shaped data |
| Manual resolution | Rare and important conflicts |
| Prevention | The conflict can be designed away |

## Decision Making

| Type | Approach |
|------|----------|
| **Reversible** | Decide quickly, measure, adjust |
| **Irreversible** | Slow down, gather evidence, write the reasoning |

Most protocol decisions are irreversible at the specification level even when the code is easy to change. A shipped guarantee becomes a floor. Treat it accordingly.

Before committing, ask what the strongest argument against the decision is, and who would make it.

## Communicating a Decision

Lead with the guarantee, then the failure mode that shaped it, then the tradeoff. Give enough of the model that someone can disagree with the reasoning rather than only with the conclusion.

For a protocol change, include:

1. What is guaranteed now.
2. What is not guaranteed.
3. What breaks for an old implementation.
4. What the migration path is.

## Estimating Protocol Work

```
Estimate = specification + (implementation × 3) + (testing × 2)
```

Specification seems simple until failure handling is included. Implementation meets cases the specification did not consider. Distributed testing is exponentially harder than unit testing.

| Phase | Share of the Work |
|-------|-------------------|
| Specification | 20 percent |
| Implementation | 30 percent |
| Testing | 30 percent |
| Production debugging | 20 percent |

An estimate that omits testing and production debugging is not an estimate. It is a hope.

---

## Failure Modes to Watch

### Testing the Happy Path

**The trap:** Proving the feature works and never proving the failure is handled.

**The fix:** Test the boundary, the empty case, the duplicate message, and the late message.

### Trusting the Clock

**The trap:** Using a timestamp as a sequence.

**The fix:** Add a monotonic counter and keep the clock for display.

### Implicit Trust

**The trap:** Assuming a peer is honest because it is inside the network.

**The fix:** State the trust assumption and verify the message at the boundary.

### Unbounded Recursion

**The trap:** A gossip or query protocol that can revisit the same node.

**The fix:** Combine a depth limit, a visited set, and a hard hop limit.

### Spec Drift

**The trap:** Changing the implementation without changing the specification, then treating the code as the source of truth.

**The fix:** Change both in the same commit, and make the specification review part of the change.

### Premature Decentralization

**The trap:** Removing a coordinator before the coordination cost has been measured.

**The fix:** Start with the simplest topology that meets the requirement and decentralize where the evidence demands it.

### Announcing Instead of Shipping

**The trap:** Treating a plan or a diagram as progress.

**The fix:** Build the smallest working trace and let the test evidence speak.

---

**Update this file when a method proves itself or a failure mode recurs.**
