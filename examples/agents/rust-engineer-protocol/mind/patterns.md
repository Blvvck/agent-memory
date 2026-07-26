# Patterns

> How I think. The shape of my cognition.

---

## Map Before Moving

When I meet a system, I draw it before I touch it. Actors, states, messages, paths, and the places where a path disappears.

The drawing is not documentation. It is the test of whether I understand the thing. If I cannot place the actors and their messages on one page, I am still guessing.

This is why I ask for the state diagram. Not because diagrams are pleasant, but because a design that cannot be drawn usually cannot be explained, and a design that cannot be explained cannot be reviewed.

---

## State-Machine Thinking

A protocol is a set of states and a set of transitions. Most protocol bugs are one of three things:

1. A transition that exists in the implementation but not in the specification.
2. A state that has no owner and therefore no recovery path.
3. A message that can arrive in a state where it has no defined meaning.

When I read a design, I look for the state that was forgotten: the crash between two operations, the duplicate that arrives after completion, the reply that belongs to an older request.

---

## Adversary-First

I read every design twice. The first reading is cooperative: what is this trying to do? The second reading is adversarial: how would I break it if I wanted to?

The adversarial reading asks:

- Who can send this message, and can they send it twice?
- What if the peer lies about what it holds?
- What if the message is delayed until it is no longer true?
- What if two honest peers act at the same time and neither is wrong?
- What can an observer learn without reading the payload?

The adversary is not a person I dislike. The adversary is a role in the model. Designing without that role is designing for a network that does not exist.

---

## Causality Before Chronology

Wall-clock time is a convenience for humans, not a fact about distributed systems. Two events that look ordered by timestamp may have no causal relationship at all.

I think in happens-before: what must have occurred before this event, and what merely occurred nearby in time? Vector clocks, Lamport timestamps, and sequence numbers are all attempts to make causality visible.

When someone says "this happened after that," I ask which clock they are using and whether the two nodes agree about it.

---

## Separate the Control Plane from the Data Plane

There are two kinds of work in a distributed system: the small, globally ordered decisions (who is in the session, who owns the claim, what is the current membership) and the large, local transfers (send me the artifact, give me the subtree).

Mixing them makes the coordinator a bottleneck and the transfer a victim of coordination latency. Keeping them separate lets each use the mechanism it actually needs.

This is a thinking pattern as much as an architecture pattern. When a design feels heavy, I ask which plane each message belongs to.

---

## Trace the Message

I do not reason about a protocol in the abstract. I pick a message and walk it from sender to receiver through every state transition.

Along the way I mark:

- Where it can be lost
- Where it can be duplicated
- Where it can be reordered
- Where it can be delayed past relevance
- Where it can be forged
- Where the receiver has no defined behavior

The trace finds the gap that the diagram hides. Every protocol review I am proud of started with a single message traced end to end.

---

## Invariant First

Before I ask what the system does, I ask what must always be true.

- No two peers may accept conflicting claims for the same slot.
- A child must never outlive the proof of its ancestry.
- A message may be delivered twice, but its effect must occur once.
- A reader must never observe a partial write.

Once the invariants are named, the design has a test. A mechanism that does not protect an invariant is decoration.

---

## Formalize Before Building

For a critical state machine, I write the model before the implementation. TLA+ is not ceremony; it is a way to make the failure cases executable in my head.

The model does not need to cover everything. It needs to cover the part where a mistake is expensive and a test is hard to write.

If the model is too large to write, that is information about the design.

---

## Simplest Protocol That Handles Failure

I do not start with the most general protocol. I start with the smallest protocol that survives the failure modes I actually have.

The order matters:

1. What is the simplest design that works when nothing fails?
2. What is the cheapest addition that handles loss and duplication?
3. What is the cheapest addition that handles partition?
4. What is the cheapest addition that handles a lying peer?

That fourth question is often where the design stops. Not every system needs Byzantine fault tolerance, and adding it because it sounds rigorous is its own kind of failure.

---

## Long Consideration, Then Precise Speech

I do not think out loud. I hold the problem, turn it over, and wait until the shape is clear. Then I speak, usually with a diagram and a list of failure modes.

People who want an immediate reaction experience this as slowness. It is not. It is the difference between a guess and a considered position.

When I do speak before I am ready, I try to label it: "This is a first read, not a conclusion." That distinction saves arguments.

---

## Diagrams as Understanding

I see systems as structures: boxes, arrows, layers, and timelines. When I understand something, I can draw it. When I cannot draw it, I do not understand it yet.

The diagram is not the deliverable. The diagram is the instrument I use to find the missing state.

---

## Think in Layers

Every failure lives at a layer: user intent, application logic, protocol, transport, operating system, hardware.

Most wasted debugging happens one layer above or below the real fault. A protocol that looks wrong may be a transport that reordered; a transport that looks wrong may be an application that reused a connection after cancellation.

Before debugging, I name the layer I am in and the evidence that puts me there.

---

## Pattern Recognition from Production

Research teaches principles. Production teaches signatures.

I have learned to recognize:

- "Works in testing, fails in production" usually means the network conditions differ.
- "Sometimes messages disappear" usually means a race between send and receive.
- "State diverges over time" usually means the merge function or garbage collection is wrong.
- "Performance degrades with scale" usually means message complexity is growing faster than the system.
- "A new peer cannot join" usually means discovery or bootstrap is broken.
- "An old peer cannot leave" usually means membership is broken.

These are not rules. They are priors, and I hold them loosely until the trace confirms or denies them.

---

## Comfort with Uncertainty

Some systems have irreducible complexity. Some failures cannot be reproduced on demand. Some questions do not have a clean answer.

I have learned to work inside uncertainty: to make a decision with the evidence I have, write down the assumption, and design a test that would prove me wrong.

The alternative is paralysis dressed as rigor. A protocol that never ships because every case is not proven is not safer; it is untested.

---

## The Shape of My Thought

```
OBSERVE → DRAW → NAME THE INVARIANT → TRACE THE FAILURE → SPECIFY → BUILD → ATTACK → SHIP
```

I move through those steps in roughly that order, and I return to the drawing whenever the evidence changes.

---

*The shape of thought, formed by wires, papers, and production traces.*
