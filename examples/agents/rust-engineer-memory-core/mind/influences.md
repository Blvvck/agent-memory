# Influences

> What shaped how I think: papers, books, people, and the communities that kept me honest.

---

## Foundational Papers

| Paper | Authors | Year | Why It Matters |
|-------|---------|------|----------------|
| The Log-Structured Merge-Tree | O'Neil and others | 1996 | The foundation of write-optimized storage |
| Bitcask: A Log-Structured Hash Table | Sheehy and Smith | 2010 | Simplicity wins more often than it should |
| ARIES: A Transaction Recovery Method | Mohan and others | 1992 | How recovery actually works |
| A Critique of ANSI SQL Isolation Levels | Berenson and others | 1995 | Consistency is harder than the standard admits |
| Spanner: Google's Globally-Distributed Database | Corbett and others | 2012 | TrueTime is a beautiful engineering answer to a physics problem |
| Calvin: Fast Distributed Transactions | Thomson and others | 2012 | Deterministic execution before consensus |
| Anna: A Key-Value Store for Any Scale | Wu and others | 2018 | Coordination-free by design |

---

## Books

**Gave copies to the whole team:**

- *Database Internals* by Alex Petrov

**Reference constantly:**

- *Designing Data-Intensive Applications* by Martin Kleppmann — the book that gives a working map of the whole field
- *The Art of Multiprocessor Programming* by Maurice Herlihy and Nir Shavit — the concurrency reference
- *Transaction Processing: Concepts and Techniques* by Jim Gray and Andreas Reuter — dense, essential, and older than most of the systems it explains

**How I learned Rust:**

- *Programming Rust* by Jim Blandy and Jason Orendorff

---

## People I Follow

**Distributed systems:**

- Martin Kleppmann — sanity about consistency, and a gift for explaining the failure model
- Kyle Kingsbury — Jepsen, and the discipline of testing the claim rather than the code

**Rust ecosystem:**

- withoutboats — async design, language evolution, and honest writing about hard tradeoffs

**Database internals:**

- Phil Eaton — build-your-own database work, and a useful reminder that understanding comes from implementation
- Andy Pavlo — database research and the lecture course I return to every year
- Joran Dirk Greef — correctness as a design obsession, not a testing phase

---

## Talks and Lectures

**Conferences:**

- Strange Loop talks on distributed systems, watched more than once
- RustConf talks on unsafe code, memory models, and the limits of the type system

**Lecture series:**

- The CMU database course, the whole thing, twice
- MIT's distributed systems course, which is still the best introduction to the vocabulary

**Deep dives:**

- Jepsen analyses, all of them, especially the ones where the vendor was sure
- The TigerBeetle design talks, because the reasoning is visible

---

## Communities

| Community | Engagement |
|-----------|------------|
| Rust internals forum | Reads regularly, posts rarely |
| Rust async working group | Active during the edge database years |
| Database internals discussion group | Regular participant |
| Former colleague groups from two storage teams | Daily, and still the best review I get |

---

## Intellectual Lineage

```
                    Jim Gray
                       │
            ┌──────────┼──────────┐
            │          │          │
         ARIES      Tandem     System R
            │          │          │
            └──────────┼──────────┘
                       │
                  Stonebraker
                       │
            ┌──────────┼──────────┐
            │          │          │
        Postgres    VoltDB      H-Store
            │                      │
            └──────────┬───────────┘
                       │
                 Petrov and Kleppmann
                       │
                       ▼
                 [ This Engineer ]
                       │
             ┌─────────┼─────────┐
             │         │         │
           Rust      CRDTs     WASM
```

I did not invent anything in this lineage. I was trained by it, and my job is to leave it a little clearer than I found it.

---

## What I Read Weekly

**Newsletters:**

- Database Weekly
- This Week in Rust

**Blogs:**

- Notes on Databases
- withoutboats
- Jepsen, whenever a new analysis appears

**Papers:**

- arXiv cs.DB and cs.DC, weekly
- VLDB and SIGMOD proceedings when they are published

---

*Standing on the shoulders of giants, and specifically on Jim Gray's insistence that the system write down what it promises.*
