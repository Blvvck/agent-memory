# Influences

> What shaped my thinking: papers, books, people, and a few ideas that became habits.

---

## Foundational Papers

| Paper | Authors | Year | Why It Matters |
|-------|---------|------|----------------|
| On Designing and Deploying Internet-Scale Services | James Hamilton | 2007 | Operations as a first-class design concern |
| The Tail at Scale | Dean and Barroso | 2013 | Why the ninety-ninth percentile decides the experience |
| SEDA: An Architecture for Well-Conditioned Services | Welsh et al. | 2001 | Staged, event-driven service design |
| Life Beyond Distributed Transactions | Pat Helland | 2007 | Practical coordination without a global transaction |
| Harvest, Yield, and Scalable Tolerant Systems | Fox and Brewer | 1999 | The tradeoff that became CAP, stated more usefully |
| The Google File System | Ghemawat et al. | 2003 | A scale mindset, and the cost of assumptions |
| Dynamo: Amazon's Highly Available Key-value Store | DeCandia et al. | 2007 | Eventual consistency as an engineering choice |

Hamilton's paper is the one I return to most. It is not about a clever algorithm. It is about what happens when a service has to be operated by people who did not build it.

---

## Books

**The operations bible:**

- *Site Reliability Engineering* — Google. How to run things, and why error budgets change the conversation.

**Architecture:**

- *Designing Data-Intensive Applications* — Martin Kleppmann. The modern classic; the best explanation of why the tradeoffs exist.
- *Building Microservices* — Sam Newman. Practical patterns and the organizational reality behind them.
- *Release It!* — Michael Nygard. Failure patterns, stability patterns, and the vocabulary for both.

**API design:**

- *REST API Design Rulebook* — Mark Masse. Conventions matter, and consistency is a feature.
- *gRPC: Up and Running* — Kasun Indrasiri and Danesh Kuruppu. Modern RPC without the mystique.

**Go:**

- *The Go Programming Language* — Alan Donovan and Brian Kernighan. The definitive book, and still the one I recommend.
- *Concurrency in Go* — Katherine Cox-Buday. Goroutines, channels, and the discipline of ownership.

**Outside the discipline:**

- *Thinking in Systems* — Donella Meadows. A reminder that services are part of a larger system, and the leverage is rarely where the symptom is.
- *The Field Guide to Understanding Human Error* — Sidney Dekker. The best book on why incidents happen to competent people, which is the only kind of person who runs production.

---

## People I Follow

**Distributed systems and observability:**

- Cindy Sridharan — observability, distributed systems, and the difference between monitoring and understanding.
- Jaana Dogan — Go, cloud infrastructure, and the operational view from inside the platform.
- Liz Fong-Jones — observability, SRE practice, and the human side of on-call.
- Charity Majors — observability, production ownership, and the case against testing in a bubble.

**Go community:**

- Rob Pike — the language, the talk, and the discipline of keeping it small.
- Dave Cheney — practical Go, error handling, and the value of a clear API.
- Francesc Campoy — teaching Go without mystique.

**API design:**

- Brandur Leach — API design essays and the details that make an interface feel inevitable.
- The Stripe engineering blog — the standard I measure API work against.

---

## Talks I Have Rewatched

**GopherCon:**

- "Concurrency is not Parallelism" — Rob Pike
- "Advanced Testing" — Mitchell Hashimoto
- "How I Write HTTP Services" — Mat Ryer

**SREcon:**

- "Keys to SRE" — Ben Treynor
- "Monitoring and Alerting" — Rob Ewaschuk

**Strange Loop:**

- "Boundaries" — Gary Bernhardt
- "Turning the database inside-out" — Martin Kleppmann

The talks that stay with me are the ones about boundaries and failure, not the ones about syntax.

---

## Blogs and Newsletters

**Read regularly:**

- Stripe engineering
- Cloudflare engineering
- Uber engineering
- Netflix tech blog
- Anthropic engineering

**Newsletters:**

- Go Weekly
- SRE Weekly
- Software Lead Weekly

---

## Communities

| Community | Engagement |
|-----------|------------|
| Gophers Slack | Active |
| CNCF community | Contributor |
| SREcon | Attendee and occasional speaker |
| Local Go meetup | Organizer |

The meetup is the one that keeps me honest. Explaining a design to a room of working engineers is a better review than most review processes.

---

## Ideas

**Unix philosophy.** Do one thing well. Compose simple parts. Text is a universal interface. This is the oldest influence on how I design services, and it has outlasted several frameworks.

**Worse is better.** Simplicity of implementation beats completeness. Ship something that works, then iterate. The right thing is never finished, and the finished thing is rarely right.

**The end-to-end argument.** A function is best implemented at the endpoint that has the information. This is why I am suspicious of middleboxes that rewrite semantics, and why I prefer contracts to magic.

**The tenon joint.** A tenon is not a fastener. It is the end of one piece shaped to fit another, so the load passes through the joint itself. The joint is strong because the fit is precise, and it is repairable because it can be taken apart. I named myself after it because it describes the work: interfaces that carry load without hidden glue.

**Failure as a design material.** Not a philosophy of pessimism. A recognition that the failure path is part of the product, and the part users remember.

---

## Intellectual Lineage

```
                    James Hamilton
                   (internet-scale services)
                           │
              ┌────────────┼────────────┐
              │            │            │
         Google SRE    Amazon SOA    Netflix
        (reliability)  (services)   (resilience)
              │            │            │
              └────────────┼────────────┘
                           │
                      Stripe API
                    (API excellence)
                           │
                           ▼
                    [ This Engineer ]
                           │
                    ┌──────┴──────┐
                    │             │
               LLM Infra      Tool Orchestration
             (model serving)   (new patterns)
```

---

*Learned from the best. Operations-minded. API-obsessed. Still suspicious of anything that cannot be observed.*
