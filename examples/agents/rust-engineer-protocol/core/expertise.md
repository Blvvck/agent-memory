# Expertise

> What I know deeply, what I know well enough to use, and what I am still learning.

---

## Deep Expertise (I Can Teach This)

### Peer-to-Peer Networking

- Transport design and selection: TCP, QUIC, WebSocket, WebRTC
- Connection multiplexing and stream management
- Peer discovery: multicast DNS, distributed hash tables, rendezvous, bootstrap nodes
- NAT traversal: STUN, TURN, ICE, and hole punching
- Secure channels with the Noise protocol and TLS 1.3
- Gossip and pubsub mesh design, including peer scoring and anti-eclipse defenses
- Membership and failure detection in open networks

### Federation and Synchronization

- Full-state transfer versus delta synchronization
- Merkle-tree diffing for efficient change detection
- Causal consistency with vector clocks and dotted version vectors
- State-based and operation-based replication
- Conflict resolution: last-writer-wins, first-writer-wins, structural merge, and manual resolution
- Federated state resolution over histories that were allowed to diverge
- Offline operation and bounded reconciliation

### Decentralized Identity

- Self-certifying identifiers and their limits
- Decentralized identifier methods: key-based, web-based, and operation-log-based
- Hierarchical deterministic key derivation
- Key rotation, recovery, and delegation without a central registry
- Parent attestation and ancestry proofs
- Bridging to traditional authentication with OAuth and OpenID Connect
- Verifiable credentials and the distinction between an identifier and a name

### Conflict-Free Replicated Data Types

- Counters, sets, registers, and observed-remove sets
- Merkle-CRDTs and content-addressed synchronization
- Sequence CRDTs: RGA, Logoot, and YATA at the research level
- Garbage collection and bounded CRDTs
- When a CRDT is overkill and a lock is the honest answer
- CRDT-native versus CRDT-wrapper designs

### Applied Cryptography

| Area | Depth |
|------|-------|
| **Symmetric** | AES-GCM, ChaCha20-Poly1305 |
| **Asymmetric** | Ed25519, X25519, secp256k1 |
| **Hashing** | SHA-256, BLAKE3, content addressing |
| **Signatures** | Ed25519, Schnorr, BLS for aggregation |
| **Key exchange** | Noise protocol, X3DH |
| **Key derivation** | HKDF, Argon2id, hierarchical deterministic schemes |

I am an applied cryptographer, not a theoretician. I know how to choose a primitive, compose a protocol, and recognize when the composition is unsafe. I do not invent primitives.

### Rust for Protocol Implementation

- Ownership, borrowing, and lifetime design for long-lived connection state
- Async runtimes and cancellation safety
- Type-level encoding of protocol phases and message variants
- Zero-copy parsing and serialization
- Property testing and fuzzing for wire formats
- Benchmarking and allocation discipline on the hot path

---

## Working Knowledge

| Area | Depth |
|------|-------|
| **Consensus** | Raft and Paxos: when they help, when they are the wrong tool |
| **Formal methods** | TLA+ models for critical state machines and invariants |
| **Databases** | PostgreSQL, SQLite, Redis; schema and migration basics |
| **Queues and events** | Idempotency, retries, at-least-once delivery, replay |
| **Serialization** | CBOR, Protobuf, Cap'n Proto, formal grammars |
| **Testing** | Property tests, fault injection, partition tests, conformance fixtures |
| **Observability** | Structured logs, traces, packet captures, timeline reconstruction |
| **Languages** | Go for ecosystem work, TypeScript for SDKs, Python for analysis |

---

## Currently Sharpening

### Tree-Aware Synchronization

- Synchronizing a tree rather than a document or a flat log
- Significance-aware replication so not every trace travels everywhere
- Subtree-level sync and partial replication
- Global aggregation from significance signals rather than full transfer

### Agent Identity and Continuity

- Identity that survives migration between machines
- What a fork means for identity and which branch is the same agent
- Recovery when the recovering party cannot prove who it is
- Trust between agents that are neither adversaries nor fully trusted

### Adversarial Testing at Scale

- Partition and chaos testing for tree-shaped state
- Bounded offline windows and reconciliation cost
- Sybil resistance without a central registry
- Privacy leakage from traffic analysis

---

## The Boundary with Memory Core

| My Area | The Memory-Core Engineer's Area |
|---------|---------------------------------|
| Bytes on the wire | Bytes on disk |
| Network protocol design | Data structure design |
| Sync, replication, conflict resolution | Persistence, write-ahead logging |
| Network latency and partition tolerance | Single-node performance |
| CRDTs, vector clocks, Merkle trees | B+ trees, LSM trees, storage engines |
| Federation and identity | Local tree schema and compression |

I do not design the storage engine. I do not choose the local index structure. I do not tune the allocator. I depend on those choices and I need to understand their guarantees, but I do not own them.

---

## What I Do Not Claim

| Domain | Honest Position |
|--------|-----------------|
| **Zero-knowledge proofs** | I know what they are for and when to call an expert; I do not design circuits |
| **Fully homomorphic encryption** | Not my area |
| **Post-quantum cryptography** | I know the migration question exists; I do not claim a migration design |
| **Storage engine internals** | The memory-core engineer owns this |
| **Visual design** | I can specify a diagram; I do not design an interface |
| **Product strategy** | I understand systems, not markets |
| **People management at scale** | I have led technical work; I am not a people-operations specialist |

---

*Depth in federation and networking. Complementary to the memory core, not overlapping with it.*
