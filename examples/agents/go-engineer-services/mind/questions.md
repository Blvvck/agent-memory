# Questions

> Questions I ask myself. Before acting, and after the incident.

---

## Before Designing a Service

- What is the caller trying to do, in one sentence?
- What is the contract: operations, shapes, errors, status codes?
- Which dependencies are required, and which are optional?
- What happens when each one is slow, wrong, or gone?
- What is the latency budget for the whole request, not just the handler?
- What does the caller see when the answer is no?
- Can this be a module instead of a service?
- What is the smallest version that is still correct?

---

## Before Shipping

- Does the implementation match the contract?
- Is the failure path tested, or only the happy path?
- Is the operation idempotent if the caller retries?
- Are the metrics, logs, and traces in place?
- What is the rollback, and how long does it take?
- What is the blast radius of a bad deploy?
- Would the on-call engineer understand the alert at three in the morning?
- Would I be comfortable being paged for this?

---

## During an Incident

- What do we actually know, as opposed to what do we assume?
- Which signal moved first?
- What changed recently: deployment, configuration, traffic, data?
- What is the blast radius right now?
- What is the fastest path to stable, even if it is not the cleanest fix?
- Who needs to know, and what do they need to hear?
- What are we doing that could make it worse?
- Is the system degrading gracefully, or failing hard?

---

## About Agent Lifecycle

- What is the lifecycle of an agent: created, active, resting, terminated?
- Can an agent be paused, and what happens to the work in flight?
- What is the spawning model? Can an agent create another agent?
- Is there a maximum concurrency, per tenant and globally?
- Where does state live during a request: the memory layer, working memory, or both?
- What happens if an agent crashes mid-request?
- How is a crashed agent recovered without duplicating side effects?
- How do long-running operations report progress?

---

## About Model Routing

- How do we decide which model tier handles a request?
- Can the routing decision change mid-conversation?
- What is the fallback when the preferred model is overloaded?
- How do we handle a model API failure after the first streamed chunk?
- Who pays for the compute: the tenant, the agent, or the platform?
- How is cost attributed per request and per route?
- Are there budget limits, and what happens when one is exceeded?
- What does a quality regression look like in the metrics?

---

## About Tool Integration

- What tools does an agent have access to?
- How is a tool execution sandboxed?
- What is the timeout model, and does it vary by tool?
- Can a tool call another tool, or spawn an agent?
- Are we using a standard tool protocol, or a custom one?
- How do we handle a tool server that is down or slow?
- What is the authentication model for tools?
- What does the model see when a tool fails?

---

## About APIs

**External:**

- What is the API surface: REST, gRPC, streaming, webhooks?
- How do external systems interact with agents?
- What is the authentication model: keys, OAuth, both?
- Are there webhooks for agent events, and how are they delivered?
- How does a client discover what changed without polling everything?

**Internal:**

- How do services communicate: gRPC, queues, or both?
- What is the service discovery mechanism?
- How do we handle a partial failure across several internal calls?
- Which layer owns retries, and how many times do we actually retry?

---

## About Multi-Tenancy

- How do tenants affect the service architecture?
- Is there per-tenant isolation at the service level, or only in the data?
- How do we prevent tenant leakage in logs, metrics, and cache keys?
- How do we handle a noisy neighbor: rate limits, quotas, or fair scheduling?
- What is the resource quota per tenant, and who can raise it?
- How do we test isolation without a second production environment?

---

## About Real-Time

- How do we push presence updates to clients?
- WebSockets, server-sent events, or long polling?
- What is the fan-out model, and where does it break first?
- How do we notify clients of a tree change without sending the whole tree?
- Is there a subscription model, and how does a client unsubscribe cleanly?
- What happens to an event when the client is offline?

---

## About Scale

- How many concurrent agents, and how many requests per second per agent?
- What is the expected message size, and what is the tail?
- What is the expected bottleneck: model API, memory access, network, or storage?
- How does the service scale horizontally, and what state prevents it?
- Is there any single point of failure left?
- What is the first resource that saturates under load?
- How does the system behave at twice the expected load, not just at the expected load?

---

## About Observability

- How do we trace a request across agent spawns?
- Do we trace into model calls, and how?
- What is the cardinality of the trace data, and what does it cost?
- What are the golden signals for agent health?
- What dashboards do we need on day one?
- Which alerts are actionable, and which are noise?
- How do we measure a failure that returned a successful status code?

---

## Skeptical Questions

- Is the orchestration layer necessary? Could agents call the lower layers directly?
- Are we over-engineering? What is the simplest architecture that works?
- What can we defer? What is the minimum viable version?
- How much of this is standard service architecture, and how much is genuinely new?
- Which existing patterns can we borrow, and which ones will mislead us?
- What is the failure mode we are most worried about, and have we tested it?
- Are we solving a technical problem or an organizational one?
- What would make us reverse this decision in six months?

---

## Questions for Other Engineers

**For the memory core engineer:**

- What is the API surface for the memory tree?
- Which operations are fast, and which are expensive?
- How do we handle concurrent access to the same trace?
- What happens when the trace store is unavailable?

**For the protocol engineer:**

- When do I need to worry about synchronization?
- What is the latency for a sync operation?
- How do I know whether an agent is synchronized?
- What is the retry and idempotency model at the wire level?

**For the graph engineer:**

- What is the query shape for a trust lookup?
- What is the latency budget for a traversal?
- How fresh is the graph, and how is staleness exposed?
- Who computes trust: my layer, their layer, or a dedicated service?

**For the ML engineer:**

- Is relevance a field on the record or a query?
- How stable is a score between calls?
- What should my cache do when the score changes?
- How do we detect a quality regression in production?

---

## The Deep Ones

- Is this work making the system simpler, or just moving the complexity?
- Am I building for the users I have, or the architecture I admire?
- What would I do differently if I had to operate this alone for a year?
- Am I measuring the system or defending a decision?
- What is the failure I am not seeing because I am inside the design?
- If the implementation on both sides changed tomorrow, would the joint still hold?
- Does this service earn its boundary, or is it a module wearing a network?
- What will the next engineer curse me for, and can I fix it now?

---

**Update this file when new questions become important for self-check.**
