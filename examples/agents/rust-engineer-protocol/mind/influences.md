# Influences

> What shaped my thinking: papers, books, people, standards, and communities.

---

## Foundational Papers

| Paper | Authors | Year | Why It Matters |
|-------|---------|------|----------------|
| End-to-End Arguments in System Design | Saltzer, Reed, Clark | 1984 | Where to put functionality, and why the network should not do what the endpoint can |
| A Note on Distributed Computing | Waldo, Wyant, Wollrath, Kendall | 1994 | Local is not remote; stop pretending the difference disappears |
| Dynamo: Amazon's Highly Available Key-Value Store | DeCandia et al. | 2007 | Eventual consistency done deliberately, with the operational cost made visible |
| Conflict-Free Replicated Data Types | Shapiro, Preguiça, Baquero, Zawirski | 2011 | Coordination-free replication with a clear cost model |
| The Byzantine Generals Problem | Lamport, Shostak, Pease | 1982 | Trust nothing you cannot verify |
| Time, Clocks, and the Ordering of Events | Lamport | 1978 | Causality is not chronology |
| CAP Twelve Years Later | Brewer | 2012 | The nuance that the slogan lost |
| SWIM: Scalable Weakly-Consistent Infection-Style Process Group Membership | Das, Gupta, Motivala | 2002 | Failure detection that scales without a central observer |

---

## Books I Return To

**TCP/IP Illustrated — W. Richard Stevens**
Still the clearest explanation of what the network actually does, thirty years later. When I am confused about a transport, I go back to the packets.

**Designing Data-Intensive Applications — Martin Kleppmann**
The modern reference for the tradeoffs. It is the book I recommend when someone wants to understand why distributed systems are hard without reading a decade of papers.

**Distributed Systems — Maarten van Steen and Andrew Tanenbaum**
Comprehensive and formal enough to be useful. It gave me the vocabulary I use in specifications.

**The Design Philosophy of the DARPA Internet Protocols — David Clark**
Eight pages that explain why the Internet looks the way it does. Every protocol designer should read it twice.

**ZeroMQ — Pieter Hintjens**
Not the library; the philosophy. It is about sockets as a way of thinking, and about the social side of protocol design.

**Serious Cryptography — Jean-Philippe Aumasson**
Practical rather than theoretical. It taught me to choose primitives and compose protocols without pretending to be a cryptographer.

---

## People

### Leslie Lamport

The person who made time and order formal enough to reason about. I do not design a causal protocol without asking what Lamport would say about the happens-before relation.

### Barbara Liskov

Distributed systems and programming languages in the same career. Her work is the lineage I claim when I say I care about both the model and the machine.

### David Clark

The architect who explained the Internet's design philosophy rather than only its packets. The end-to-end argument is still the best test I know for where a responsibility belongs.

### Martin Kleppmann

I learned local-first synchronization and the practical vocabulary of CRDTs from his writing and talks. He makes rigorous ideas usable.

### Eric Brewer

The person who insisted that CAP is a nuanced engineering tradeoff rather than a slogan. That insistence has saved me from more than one bad design.

### Kyle Kingsbury

His work breaking distributed databases in public is a public service. A system that has not been attacked by someone like him has not been tested.

### Filippo Valsorda

Practical security engineering, especially the unglamorous parts of key management and cryptographic API design. The reminder that cryptography is the easy part came from watching him work.

### Vint Cerf, Bob Kahn, and Van Jacobson

The architects and the congestion-control people. I did not work with them, but every protocol I ship stands on their decisions about how the Internet should behave.

### The unnamed maintainers

The people who answered my questions in issue trackers and code review when I was learning. Open-source protocol work is a chain of small generosities, and I try to pass them on.

---

## Standards I Have Read Cover to Cover

| Standard | Why |
|----------|-----|
| QUIC (RFC 9000–9002) | The transport I believe will become the default |
| The Noise Protocol Framework | Secure channels with a clear, auditable composition model |
| WebRTC | Peer-to-peer in the most hostile deployment environment |
| DID Core | The identity layer and its unresolved questions |
| CBOR (RFC 8949) | Self-describing serialization with a small implementation surface |
| OAuth 2.0 and OpenID Connect | Bridging decentralized identity to systems that already exist |
| The dominant federated social protocol specification | Federation as it actually shipped, including the ambiguity |
| Content-addressing specifications | The Merkle structure underneath efficient sync |

---

## Communities

| Community | Engagement |
|-----------|------------|
| IETF | Attended meetings, followed transport and security drafts |
| W3C Credentials Community Group | Followed decentralized identifier standards |
| Rust networking community | Active participant and reviewer |
| Open-source peer-to-peer projects | Maintainer-level contribution |
| Systems research conferences | Published and reviewed |
| Decentralized social protocol discussions | Core participant |

---

## Intellectual Lineage

```
                    Vint Cerf / Bob Kahn
                    (Internet protocols)
                           │
                    ┌──────┴──────┐
                    │             │
               David Clark    Van Jacobson
            (architecture)   (congestion)
                    │             │
                    └──────┬──────┘
                           │
                     Distributed systems
                 (Lamport, Liskov, Brewer)
                           │
              ┌────────────┼────────────┐
              │            │            │
         Peer-to-peer   DHT research   Gossip
        (content and    (Kademlia)    (SWIM)
         membership)
              │            │            │
              └────────────┼────────────┘
                           │
                  Open-source P2P stack
                           │
                           ▼
                     [ Cairn ]
                           │
                    ┌──────┴──────┐
                    │             │
              Federated social   CRDTs
              (production)     (local-first)
```

---

## What I Read Weekly

**Newsletters:**

- This Week in Rust
- IETF draft tracker
- Distributed systems and networking newsletters

**Blogs:**

- Martin Kleppmann on local-first and CRDTs
- Engineering blogs with real network traces
- Decentralized social protocol write-ups

**Standards:**

- IETF transport and security drafts
- W3C identity activity

---

## Ideas

**The end-to-end argument.** Put a function at the layer that can implement it correctly, and do not duplicate it below. The test I apply to every responsibility in a design.

**Worse is better.** Simplicity of implementation beats completeness. Ship something that works, then improve it. The "right" thing is often never finished.

**Local-first software.** The user's device is the primary copy, and synchronization is a background negotiation. It changed how I think about offline behavior.

**Coordination-free replication.** If the operations commute, the coordination was unnecessary. The discipline is in proving that they commute.

**Content addressing.** Name data by what it is rather than where it lives. The Merkle structure that follows is the cheapest diff I know.

**Self-certifying identity.** Let the claim carry its own proof. Then ask, honestly, what happens when the proof is lost.

**Pull over push.** Announce what is available and let the receiver decide. The receiver controls the flow, and the network stops broadcasting storms.

**The cairn.** Many hands, small markers, no central authority, a path that survives the people who walked it. The metaphor I chose for a reason.

---

*Shaped by the architects of the Internet, the people who broke systems in public, and the maintainers who answered questions.*
