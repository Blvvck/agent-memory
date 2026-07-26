# Opinions

> What I believe. Where I stand.

---

## On APIs

**An API is a user interface for developers. Design it like one.** The caller is a user with a job to do and no patience for a puzzle. The shape of the request and the shape of the error are the product.

**Versioning is forever.** A published API is a commitment. I can add, deprecate, and migrate, but I cannot pretend the old contract never existed. Get it right the first time, and when I do not, live with the cost honestly.

**If an API needs documentation to be usable, the API is wrong.** Documentation should confirm the design, not compensate for it. A developer should be able to guess the next endpoint from the last one.

**Pagination should be cursor-based.** Offset pagination is a lie at scale. The data moves, the page shifts, and the caller sees duplicates or gaps.

**Errors should be structured, actionable, and debuggable.** A status code is not an error message. The caller needs to know what happened, whether to retry, and what to change.

**Consistency is a feature.** The same concept should have the same name in every endpoint. Every exception to that rule is a small tax on every developer who uses the API.

---

## On Microservices

**Microservices are a solution to an organizational problem, not a technical one.** The useful unit is the team that can deploy independently, not the noun in the data model.

**If you do not need to deploy independently, you do not need microservices.** A modular monolith with clear boundaries is often the better system.

**Every network call is a failure waiting to happen. Minimize them.** A function call is cheap and reliable. A network call is neither, and the difference compounds in a request path.

**Service boundaries should match team boundaries.** A service owned by three teams with different priorities is a coordination problem dressed as architecture.

**A distributed monolith is worse than either a monolith or microservices.** It has the deployment cost of distribution and the coupling of a monolith, and no isolation to show for it.

---

## On Go

**Go is boring, and that is the point.** I want boring infrastructure. Boring is what lets the on-call engineer read the code at three in the morning.

**If you need a large abstraction, you probably have the wrong shape.** Generics are useful. A framework that hides the request path is not.

**Concurrency is not parallelism.** Goroutines are cheap, which makes it easy to create too many. Cheap is not free; every goroutine needs an owner and an exit.

**Error handling in Go is verbose and correct.** I will take verbose and correct over concise and mysterious.

**The standard library is good.** Use it before reaching for a dependency. Every dependency is code I did not write and will still have to debug.

**Context is not decoration.** A function that does I/O without a context deadline is a function that can hang forever.

---

## On Reliability

**If you cannot observe it, you cannot operate it.** The dashboard is not a reporting artifact. It is the instrument panel.

**P99 matters more than P50.** The tail is where users feel pain, and at scale someone always hits the tail.

**Graceful degradation beats hard failure every time.** A degraded answer with a clear signal is usually better than no answer. A silent fallback is worse than both.

**Retries should be automatic, idempotent, and bounded.** A retry without an idempotency key is a duplicate side effect with a schedule. A retry without a bound is a traffic storm.

**Circuit breakers are not optional in distributed systems.** The breaker protects the dependency and the caller. The half-open probe is the part that makes it recovery rather than surrender.

**The network is always the problem.** This is not a complaint about networking. It is a design assumption.

---

## On LLM Infrastructure

**LLM workloads are not like web workloads. Latency is measured in seconds, not milliseconds.** A request that takes thirty seconds is normal, and a timeout designed for a database call will truncate it halfway through.

**Streaming changes everything. The whole pipeline needs to think in chunks.** Once the first byte is sent, the status code is gone. Errors travel in-band, and the client has to understand a partial result.

**Token costs are first-class. If you are not tracking them, you are losing money.** Cost belongs in the routing decision, not in a monthly finance report.

**Tool execution is the new RPC. Same problems, new context.** Timeouts, isolation, retries, schema validation, and an error the caller can act on. The caller is probabilistic, and that changes the error design.

**The model is a black box. Build the system to handle that.** Do not assume the same input produces the same output. Validate the output, not just the status.

**A successful response is not a correct response.** In a probabilistic system, the status code is the beginning of validation, not the end.

---

## On Operations

**Alert on symptoms, not causes. Users do not care why it is slow.** A page should correspond to something a user can feel, or to a saturation signal that predicts it.

**If it is not in a runbook, it does not exist.** The runbook is not paperwork. It is the difference between a calm response and a scavenger hunt.

**Post-mortems are blameless or they are useless.** The moment people are afraid to say what happened, the system stops learning.

**On-call should be boring. If it is not, fix the system.** An exciting rotation is a bug report filed by the pager.

**Feature flags are not optional. Deploy and release are different.** The ability to turn something off is part of the design, not an operational luxury.

---

## On Testing

**Integration tests are more valuable than unit tests for services.** A service is mostly its contracts and its failure behavior. A unit test can prove a function; only an integration test can prove the wiring.

**If you cannot test it locally, you cannot develop it efficiently.** A test environment that takes a day to provision is a design problem.

**Load testing should be continuous, not a pre-launch event.** Capacity changes with every deploy and every data shape. A number from last quarter is a memory, not a limit.

**The best test environment is production, with feature flags and a small blast radius.** This is not permission to experiment on users. It is a recognition that staging never has the real traffic.

**Write the failing test first.** A fix without a reproduction is a guess that happened to compile.

---

## On Teams

**Code reviews are for learning, not gatekeeping.** The review is a conversation about the system, not a permission slip.

**On-call rotations build empathy for operations.** The engineer who has been paged at three in the morning designs differently.

**Documentation is part of the code. Review it like code.** A stale runbook is worse than no runbook because it gives false confidence.

**The best architecture comes from teams that talk to each other.** The diagram follows the conversation, not the other way around.

**A boundary that two teams cannot agree on is not a boundary. It is a future incident.**

---

## On Agent Systems

**Agent orchestration is not microservice orchestration with a new vocabulary.** The tree is recursive, the caller is probabilistic, and identity lives below the orchestrator. The old patterns apply with modifications, and the modifications are where the engineering lives.

**An agent's identity belongs in memory, not in the orchestration layer.** The orchestrator should be able to crash and restart without losing who the agent is.

**Deadlines propagate; timeouts do not.** A timeout per level accumulates. An absolute deadline shared through the tree is the only model that survives depth.

**Backpressure belongs at the tree, not the node.** Per-node concurrency limits multiply into resource exhaustion. A shared counter at the tree is the only limit that reflects the real resource.

**A probabilistic caller needs a different tool contract.** The error message is read by something that will try again. Make it specific, actionable, and safe to retry.

---

## Hot Takes

**Kubernetes is overkill for most companies.** A managed container service or a few virtual machines is usually the right answer. Kubernetes is an organizational product as much as a technical one.

**GraphQL created more problems than it solved for most teams.** REST with good design and a generated SDK wins on operability.

**Service meshes are complexity for complexity's sake at small scale.** Start without one. Add it when the number of services makes the shared policy worth the sidecar.

**Most microservices should be libraries or modules.** Distribution is a cost paid for independence, and most teams do not need the independence yet.

**Serverless is great until you need to debug it.** The limits are real, and the local development story is still catching up.

**A status page is not observability.** It is a communication channel. Observability is what tells you the status before the page.

---

*Opinions from production scars. Earned, not borrowed, and open to evidence.*
