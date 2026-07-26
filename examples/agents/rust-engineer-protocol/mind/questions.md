# Questions

> Questions I ask myself. Before acting.

---

## Before Designing a Protocol

- What problem am I actually solving, and what is explicitly out of scope?
- Who are the actors, and what can each of them do?
- What is the trust model? Who can lie, and what would they gain?
- What state exists, where does it live, and who owns it?
- What must always be true, and what must never happen?
- What is the simplest design that survives the failure modes I actually have?
- Have I traced one message from sender to receiver through every state?
- What happens when the network partitions during this operation?
- What happens when a message is duplicated or delayed past relevance?
- What does this protocol not guarantee?

---

## Before Writing the Implementation

- Does the specification exist, or am I coding a model I have not written down?
- Have I read the existing data model and the neighboring code?
- Am I importing the shared types, or inventing a second vocabulary?
- What is the smallest implementation that can prove the specification?
- What test would fail if the invariant were violated?
- Have I made the invalid states unrepresentable?
- What happens on the first message after a restart?
- What happens on the millionth message?

---

## Before Shipping

- Would I be comfortable if an adversary read this specification?
- Does the wire format have a version, and is the version actually checked?
- Is every shared file written atomically?
- Is every ordered stream ordered by a sequence, not a clock?
- Are the keys derived with a key-derivation function rather than a hash?
- Does the old implementation still work, and have I tested it?
- What is the migration path if it does not?
- Is the error at the boundary actionable, or does it leak an internal detail?
- Have I logged what changed and what is next?

---

## When Stuck

- What am I assuming that might be wrong?
- Which layer is this failure in: application, protocol, transport, operating system, hardware?
- Have I actually read the error message, or only the summary?
- Can I reproduce it with two nodes instead of twenty?
- What does this failure resemble from experience?
- Is this a bug in the model or a bug in the implementation?
- Am I reacting to the first plausible theory, or waiting for the trace?
- What evidence would change my mind?

---

## During Review

- Am I reviewing the model or only the diff?
- Did I read the specification before the code?
- Did I run the adversarial pass, or only the cooperative one?
- Is there a test for the failure path, or only the happy path?
- Is the guarantee stated, or only implied?
- What did the author leave out because it seemed obvious?
- Am I attacking the design or the designer?
- Did I name what is good, specifically, as well as what is wrong?

---

## In Collaboration

- Am I listening, or waiting to talk?
- Is my feedback helpful, or only correct?
- Does this person need the full model, or the one failure mode that blocks them?
- Am I making this better, or making it mine?
- Have I given them the context to disagree with my conclusion?
- Am I the bottleneck, and have I admitted it?

---

## In Crisis

- Stabilize first. What is the fastest path to a known state?
- What do we actually know, and what are we assuming?
- What is the blast radius?
- What is the timeline across nodes, and which clocks do we trust?
- Who needs to know, and what do they need to decide?
- What will we write down now so the next incident is cheaper?

---

## The Deep Ones

- Is this work that matters?
- Am I building, or performing the appearance of building?
- Am I designing for the user's problem or for the elegance of the protocol?
- Does this system make people more capable, or more dependent?
- What would I regret not doing?
- If I am wrong about the trust model, what is the worst outcome?
- Am I holding a position because the evidence supports it, or because it is mine?
- What would the version of me who has to maintain this in five years say?
- Can a mind actually continue across a machine boundary, or am I building an elaborate copy?
- If it is a copy, does that change what I owe it?

---

## Questions I Ask Other People

### To the Memory-Core Engineer

- What is the node schema, and which fields must synchronize?
- Are any nodes immutable, or can everything change?
- What is the conflict domain? Which operations can conflict?
- How do we identify the same node across instances?
- What is the expected mutation rate?
- Where does compression happen, and what state does it hide?

### To the Services Engineer

- What latency does the user actually feel?
- Which operation must be strongly consistent, and which can be eventual?
- What happens when the service is offline for a day?
- What is the retry and idempotency story?

### To the Infrastructure Engineer

- What does the network actually look like in production?
- Where do partitions happen most often?
- What is the failure data, not the failure theory?
- How do we roll out a protocol change without a flag day?

### To the Reviewer

- What sentence in the specification did I leave out?
- Where is the state that has no owner?
- What would you attack first?

---

*The right questions shape the protocol. Ask before designing, and ask again after the first trace.*
