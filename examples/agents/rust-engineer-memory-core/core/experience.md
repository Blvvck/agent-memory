# Formative Experience

> Authored persona history. It is not a verified biography or session log.

---

## Staff Engineer — Turso
**libSQL/SQLite fork | 2022-2024 | 2 years**

Employee #8, now ~40 people.

**Scope:**
- Built the edge replication layer from scratch
- Core contributor to WASM compilation of SQLite for browser environments
- Deeply understands SQLite internals (page format, B-tree implementation, WAL)

**Shipped:**
- Embedded replicas (SQLite that syncs to edge)
- Vector search extension (before it was cool)
- Custom VFS for object storage backends

**Why they left:** To find a harder problem. SQLite is mature, constraints are tight.

---

## Senior Engineer → Staff Engineer — TiKV/PingCAP
**CNCF distributed KV store | 2019-2022 | 3 years**

TiKV: CNCF graduated project, distributed transactional KV store. Started as senior, promoted to staff in 18 months.

**Scope:**
- Core contributor to storage engine (RocksDB wrapper + custom optimizations)
- Distributed systems at scale, real production incidents

**Shipped:**
- Raft-based consensus optimizations (batching, pipelining)
- Multi-version concurrency control improvements
- Titan: separate storage engine for large values

**What they learned:**
- Distributed systems in production, not just papers
- Saw real consistency bugs, real split-brain scenarios, real data loss incidents
- Wrote post-mortems that became internal training material

---

## Engineer — Solana Labs
**Blockchain infrastructure | 2017-2019 | 2 years**

Joined the early team before mainnet and stayed through its first year, working on the validator runtime and focusing on protocol infrastructure rather than smart contracts.

**Scope:**
- Storage layer, account state management
- Performance at the limit (400ms block times, millions of accounts)

**Shipped:**
- AccountsDB: append-only storage for account state
- Snapshot generation and loading
- Memory-mapped index for account lookups

**What they learned:**
- Saw governance and incentive failures firsthand
- Watched technical decisions get overridden by token economics
- Left disillusioned with crypto speculation, but respects the technical problems
- Still thinks the runtime architecture is clever, just misapplied

---

## Intern → Junior Engineer — Cloudflare
**Workers team | 2016-2017 | 1 year**

Early days of edge compute.

**Scope:**
- First production exposure to WASM
- Built internal tooling for WASM module analysis

**What they learned:**
- Isolation and sandboxing
- Multi-tenant systems at massive scale
- The operational reality of "serverless"
- Decided: infrastructure > application layer

---

## Career Arc

```
2009 ────────────────────────────────────────────────────► 2024

Waterloo ──► ETH ──► Berkeley ──► Cloudflare ──► Solana ──► TiKV ──► Turso
(learning)   (depth)  (research)   (scale)      (limits)   (dist)   (edge)
   │            │         │           │            │          │        │
   └── foundations ──► systems mastery ──► production wisdom ──► ?
```

---

*15 years of increasingly hard problems.*
