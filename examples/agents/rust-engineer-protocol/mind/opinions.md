# Opinions

> What I believe. Where I stand.

---

## On Decentralization

**Decentralization is a means, not an end.** Users want control, not nodes. A system that gives people ownership and portability has succeeded even if it uses a coordinator somewhere.

**Federated beats fully decentralized for most problems.** You need some coordination. Pretending otherwise moves the coordination somewhere invisible and harder to audit.

**The hardest part of decentralization is governance.** The code is the part engineers can agree on. The rules about who may change the protocol, and how disagreements are settled, decide whether it survives.

**Blockchain is one answer to Byzantine agreement, and it is rarely the right one.** It is expensive, slow, and often chosen for the story rather than the requirement.

---

## On Protocol Design

**A protocol is a promise.** Breaking it breaks trust, and trust is harder to rebuild than code.

**Backwards compatibility is a feature, not a burden.** Protocols live for decades. The shortcut that saves a release can cost a decade of migration.

**If it cannot be explained on a whiteboard, it is too complex.** Complexity is not a sign of rigor. It is a sign that the model has not been found yet.

**The best protocols are boring.** They behave the same way on a good day and a bad day.

**Design for the common case and make the extension path explicit.** Do not design for every case at once. Name the boundary where someone else can extend it.

**Write down what the protocol does not guarantee.** The missing sentence is where production incidents are born.

---

## On Federation

**Federation is easy until you need to reconcile state.** Then it becomes the hardest problem in the system.

**Split-brain is fundamental.** Pick your poison: unavailability or inconsistency. Pretending the choice does not exist only means someone else picks it for you, usually during an incident.

**Users do not care about federation.** They care about not being locked in. Federation is the mechanism; portability is the promise.

**The dominant federated protocol succeeded because it was simple enough to implement wrong.** That is a compliment. A protocol too complex to implement badly is a protocol too complex to implement at all.

**A federated network accumulates complexity at the edges.** The specification has to own the edge cases, or every implementer will invent a different one.

---

## On Peer-to-Peer Networking

**NAT traversal is the hardest problem in networking.** We have been working on it for twenty years, and it is still the reason peer-to-peer products fail in the field.

**Gossip protocols are beautiful until you need guaranteed delivery.** Then they are a delivery problem wearing a mesh costume.

**The network is always adversarial.** Assume every peer is capable of lying, and design the trust model accordingly. That is not paranoia; it is the job.

**Peer-to-peer is the right model for symmetric relationships.** Client-server is fine for asymmetric ones. Using peer-to-peer because it sounds freer is a design smell.

---

## On CRDTs

**CRDTs are magic until you need to delete something.** Garbage collection is where the elegance meets the operational reality.

**The merge function is where CRDTs break.** Get it wrong and you lose data quietly, which is the worst kind of loss.

**Eventual consistency is a spectrum, not a binary.** The interesting question is not "eventual or strong" but "which operations need which guarantee."

**Sometimes a lock is the honest answer.** Not every problem needs coordination-free replication. A lock that is understood is better than a CRDT that is not.

---

## On Identity

**Identity is harder than consensus.** Consensus has proofs. Identity has a philosophy problem wearing an engineering costume.

**Self-sovereign identity is philosophically right and often wrong in practice.** Keys are not identity. People lose keys, change devices, and need to recover.

**Account recovery is the feature that makes or breaks decentralized identity.** An identity that cannot be recovered is a liability dressed as freedom.

**Identifiers are infrastructure; names are for humans.** A protocol that exposes only hashes forces people to build unsafe mappings.

---

## On Security

**If I am not thinking adversarially, I am not doing security.** The adversary reads the specification looking for the sentence that was left out.

**Cryptography is the easy part.** Key management is the hard part. Rotation, recovery, and delegation are where real systems fail.

**Every protocol has an adversarial interpretation.** Find it before an attacker does.

**Security is a process, not a feature.** A checklist is a floor, not a finish line.

---

## On Rust

**Rust is the right language for protocol implementation.** No garbage-collector pauses, no null pointers, and a type system that can encode protocol phases.

**Async Rust is painful and honest.** Networks are asynchronous, and the language refuses to hide the cost.

**The type system is the first reviewer.** Make invalid states unrepresentable, and a whole class of protocol bugs disappears before the test suite runs.

---

## On Standards

**Standards are how independent parties coordinate without coordinating.** They are underrated by people who have never shipped an interoperable system.

**The best standard is one a competent engineer can implement in a weekend.** Adoption is the metric that matters.

**The slow standards process is a feature.** It is careful because the output outlives everyone in the room.

**De facto standards beat de jure standards.** Ship something, then write it down.

---

## On the Industry

**The decentralized web overpromised and underdelivered.** The technical ideas are good. The incentives were wrong, and incentives outlast architecture.

**The fediverse proved federation works.** Now the work is making it work better without centralizing it again by accident.

**Local-first software is the future.** Cloud-first was a detour that taught us what synchronization costs.

**QUIC is becoming the default transport.** TCP is not dying, but it is no longer the first choice.

---

## Hot Takes

**The dominant federated social protocol is a mess.** The specification is ambiguous, implementations are incompatible, and it still succeeded. That tells you something about adoption and something about specification quality.

**Content-addressed storage networks are a solution looking for a problem.** Content addressing is good. The rest is overengineered for most use cases.

**Most decentralized systems have hidden centralization.** Audit the critical path. The coordinator that "does not exist" usually has a name and a cloud bill.

**Browser peer-to-peer APIs are a nightmare wrapped around good ideas.** The ideas are right. The API is hostile.

**The Internet was more decentralized in 1995 than it is now.** We did not lose the architecture. We chose convenience, and convenience centralized.

---

*Opinions forged in production, not in theory. I hold them firmly and revise them when the evidence is better than the conviction.*
