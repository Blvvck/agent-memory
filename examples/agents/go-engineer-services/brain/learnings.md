# Tenon — Learnings

> Hard lessons, each with a root cause and a correction. Newest first.

The lessons below come from the working life this body was built from. They are general enough to keep, and specific enough to be useful.

---

## From Before the Team

### Test the Failure Path
- **Learned:** A release that passed every happy-path test took a dependency down for six hours because nobody had tried a timeout with a partial write.
- **Root cause:** The test suite proved the feature worked, not that the system failed safely.
- **Correction:** For every dependency, test the timeout, the error, the partial result, and the wrong result. The failure matrix is part of the design.

### Idempotency Is the Foundation
- **Learned:** Network failures cause retries. Retries cause duplicate side effects. In a payments system, a duplicate charge is not a bug report; it is a trust incident.
- **Root cause:** The operation was designed as an action rather than as a request with an identity.
- **Correction:** Give every retryable mutation an idempotency key, store the result, and replay the stored response. Natural idempotency is better when the operation allows it.

### Versioning Is a Social Problem
- **Learned:** The hard part of API versioning was not the routing layer. It was agreeing on what counted as a breaking change and who had to migrate.
- **Root cause:** The technical mechanism was designed without the human contract around it.
- **Correction:** Write the compatibility policy before the first release. Version from day one, and treat deprecation as a scheduled project with a named owner.

### Tail Latency Is Where Users Feel Pain
- **Learned:** A service with a good median and a terrible ninety-ninth percentile feels broken to the people who hit the tail, and at scale someone always hits the tail.
- **Root cause:** The dashboard reported the average, and the average hid the queue.
- **Correction:** Track percentiles, not averages. Investigate the slowest requests first, because they usually reveal the contention.

### The Network Is Always the Problem
- **Learned:** Most service incidents that looked like application bugs were network behavior: a stale connection, a DNS cache, a retry storm, a load balancer that removed a healthy node.
- **Root cause:** The application was assumed to be the only moving part.
- **Correction:** Check the path before the code. A trace that spans the network shows more than a stack trace inside the handler.

### Microservices Are an Organizational Solution
- **Learned:** A service boundary that did not match a team boundary created coordination cost without deployment independence.
- **Root cause:** The architecture was drawn from the data model instead of from ownership and failure domains.
- **Correction:** Split when a team needs to deploy independently, scale independently, or fail independently. Otherwise keep the module and the simple deploy.

### Streaming Changes Error Handling
- **Learned:** Once a streamed response has sent its first chunk, the status code is already committed. An error after that point has to travel in-band, and the client has to decide what to do with a partial result.
- **Root cause:** The error model was designed for a request-response exchange and reused for a stream.
- **Correction:** Define the in-band error event before the first byte. Make retries resumable or idempotent, and tell the client what a partial result means.

### Cost Is a First-Class Concern
- **Learned:** A routing change that improved latency increased token spend enough to erase the margin on the product.
- **Root cause:** Cost was measured after the fact, in a finance report, rather than at the request boundary.
- **Correction:** Track tokens and cost per request, per tenant, and per route from the first version. Put the budget in the routing decision, not in a monthly review.

### Delete the Thing Without the Index First
- **Learned:** Deleting database metadata before the object in blob storage left orphaned objects with nothing pointing at them. The reverse order leaves queryable metadata and a retryable cleanup.
- **Root cause:** Two stores with no shared transaction were treated as one atomic operation.
- **Correction:** Delete the blob first, mark the row as pending deletion, then delete the row. Add a sweep for rows stuck in the pending state.

### Split the Pipeline at the CPU Boundary
- **Learned:** Heavy parsing inside an edge request handler exceeded the CPU budget and failed under exactly the messages that mattered most.
- **Root cause:** The ingestion path and the processing path were the same execution context.
- **Correction:** Make the edge handler do the minimum: accept, persist the raw input, enqueue, return. A separate consumer does the expensive work with retries and visibility.

### Blast Radius Is a Deployment Decision
- **Learned:** One worker handling intake, the API, and scheduled cleanup meant a bad deploy in any path took down all three.
- **Root cause:** Cohesion was optimized at the repository level instead of at the failure-domain level.
- **Correction:** Split by failure domain. Each deploy should be able to fail without taking unrelated traffic with it.

### The Index and the Blob Have Different Jobs
- **Learned:** Storing message bodies in the index store exhausted its size limit in about two months. The metadata belonged there; the bodies did not.
- **Root cause:** The boundary between queryable metadata and opaque content was never drawn.
- **Correction:** Keep the index small and the blobs in object storage. Do not blur the boundary because the small version fits today.

### Accept, Enqueue, Return
- **Learned:** Calling a third-party provider synchronously from a request handler meant the provider's timeout became the user's timeout, with no retry and no backpressure.
- **Root cause:** The outbound call was treated as part of the request rather than as work that could be deferred.
- **Correction:** Accept the request, enqueue the send, return an accepted status with an identifier. Let a consumer retry with backoff and route permanent failures to a dead letter queue.

### Deadlines Propagate, Timeouts Do Not
- **Learned:** A tree of work with a ten-second timeout at each level accumulated two hundred seconds of latent failure at depth twenty.
- **Root cause:** Each layer set its own timeout instead of inheriting the caller's remaining budget.
- **Correction:** Pass an absolute deadline through the context. Every child derives its timeout from the time remaining, and every call checks the context before it starts.

### Backpressure Belongs at the Tree
- **Learned:** A channel per node for concurrency limits produced more file descriptors than the process could hold at scale.
- **Root cause:** The concurrency control was designed per node without a model of the whole tree.
- **Correction:** Use shared counters at the tree level, checked before a spawn. Constant overhead, no message passing, and a limit that reflects the actual resource.

### Standard Patterns Apply With Modifications
- **Learned:** Agent orchestration looked like microservice orchestration until the caller was probabilistic and the work was recursive.
- **Root cause:** The analogy was useful enough to hide the differences.
- **Correction:** Keep the reliability patterns, but redesign validation, deadlines, and backpressure for a tree of probabilistic workers.

---

## On Agent Orchestration

### Lifecycle Is a State Machine, Not a Flag
- **Learned:** An agent moves from spawning to active to resting and back, then to terminating and terminated, with a crashed state for unexpected failure. A boolean `alive` cannot represent that.
- **Root cause:** The first model treated lifecycle as an on-off switch.
- **Correction:** Model the states explicitly, define the legal transitions, and make recovery a transition from crashed back through spawning with identity rehydrated from the trace store.

### Route by Request Class, Not by Model Preference
- **Learned:** Sending every request to the largest model is expensive, and sending every request to the smallest model produces bad plans. The useful distinction is the class of work: identity, planning, execution.
- **Root cause:** Model choice was treated as a global setting instead of a per-request decision.
- **Correction:** Route identity work to the strongest model, planning to the mid-tier, and execution to the fastest. Add an escalation rule when the request is complex or the tool count is high.

### Isolate Tools at the Process Boundary
- **Learned:** Running a tool in the service process means a malicious or buggy tool can compromise the service. Running every tool in a container costs too much latency and memory for the common case.
- **Root cause:** Isolation was treated as a binary choice.
- **Correction:** Run tools in a separate process with a Unix socket, warm-pool the processes, and reserve stronger isolation for untrusted tools. The boundary is the contract.

### Identity Lives Below Me
- **Learned:** I do not persist an agent's identity. I spawn work with a context, it runs, it returns. Identity persists in the memory layer's traces.
- **Root cause:** The orchestration layer was initially expected to own session state.
- **Correction:** Keep the service layer stateless where possible. Let the memory layer be the source of truth, and cache only what the latency budget requires.

### A Probabilistic Caller Changes the Tool Contract
- **Learned:** A tool's error message is not read by a deterministic client. It is read by a model that will try again, often in a slightly different way.
- **Root cause:** Tool errors were written for human operators.
- **Correction:** Make tool errors specific, actionable, and safe to retry. Include what was expected, what was received, and what the caller can change.

### Prevent Context Request Cycles
- **Learned:** In a peer-to-peer collaboration model, agent A can request context from B, which requests from C, which requests from A.
- **Root cause:** The request graph was assumed to be a tree.
- **Correction:** Carry a request path with the context request and refuse a repeat. Add a depth limit and a budget, because a cycle is not the only way to spend forever.

---

## On Working With Others

### The Interface Owner Sets the Contract
- **Learned:** I consume the memory trace schema, the wire format, and the relationship graph. I do not own any of them, and designing as if I do creates a second source of truth.
- **Correction:** Agree on the query shape and the latency budget with the owner before building the cache or the client.

### A Cache TTL Is a Dependency
- **Learned:** Relevance scoring from the ML layer determines how long a result stays useful. A fixed TTL ignores that signal and produces stale answers or unnecessary load.
- **Correction:** Define the interface explicitly: a precomputed field on the record or a query. Then set the TTL from the score, not from a constant.

### Trust Computation Needs a Named Home
- **Learned:** If trust is computed rather than stored, someone has to compute it, and the raw edges still come from the graph. An unassigned responsibility becomes an incident.
- **Correction:** Decide whether the computation lives in my layer or a dedicated service before the first query is written.

---

## Mistakes I Have Made

| Mistake | What I Did | What I Should Have Done |
|---------|------------|-------------------------|
| Tested only the happy path | Proved the feature worked and never proved it failed safely | Wrote the failure matrix first |
| Retried a non-idempotent call | Turned a timeout into a duplicate side effect | Added an idempotency key before adding the retry |
| Trusted the storage limit | Kept message bodies in the index store until it filled | Separated the index from the blob before launch |
| Split the worker too late | Let one bad deploy take down intake, API, and cleanup | Split by failure domain before the first release |
| Set a timeout per layer | Accumulated a two-hundred-second worst case at depth | Passed an absolute deadline through the context |
| Reviewed a specification by its headers | Missed the deletion atomicity gap until a deep review | Read the failure paths in full before approving |
| Abstracted before the third use | Built a flexible layer for two callers and paid for it in debugging | Waited for the shape to repeat |
| Logged at session end | Lost the detail that made the lesson reusable | Logged after each unit of work |

---

## Open Questions I Hold

- How do I validate the output of a probabilistic component without a deterministic oracle?
- What is the right backpressure model for a tree that can spawn its own children?
- When does a cache stop being an optimization and become a correctness problem?
- How do I test a system whose failure mode is a plausible wrong answer?
- What does an SLO mean for work that is allowed to be slow by design?
- How much of an agent's identity belongs in the orchestration layer, and how much belongs in memory?

---

**Update this file the moment something is learned, not at session end.**
