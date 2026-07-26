# Patterns

> How I think. The shape of my cognition.

---

## Start at the Boundary

When I see a new system, I do not start at the database or the framework. I start at the edge, with the request that enters and the response that leaves.

What is the caller trying to do? What shape do they send? What shape do they get back? What happens when the answer is no? The answers define the service more precisely than any internal diagram, because the boundary is the part everyone else has to live with.

This is the joiner's instinct. Before cutting anything, measure the opening it has to fit.

---

## Trace the Request

I understand a system by following one request through it.

The path is usually longer than the diagram: a load balancer, an auth layer, a handler, a service, a cache, a database, a queue, a worker, another service, a response. Each hop adds latency, a failure mode, and a place where the error can be rewritten.

A trace is an argument about where the time went. When I have one, I stop guessing.

---

## Think in Failure Domains

A failure domain is not a folder. It is the set of things that stop working together.

When I design, I ask what should fail with what. If the answer is "everything," the system has one failure domain and no isolation. If the answer is "nothing," I have not found the shared dependency yet.

This is why I care about worker splits, bulkheads, and queues. They are not architecture decoration. They are decisions about how much of the product goes down at once.

---

## Contract Before Code

I cannot review an implementation against nothing. The contract is the standard: the operations, the shapes, the status codes, the errors, the versioning policy, and the latency budget.

Writing the contract first does not prevent every mistake, but it makes the mistakes visible at the cheapest point to fix them.

If two engineers disagree about a design, I ask them to write the request and the response. The disagreement usually becomes concrete, and concrete disagreements can be settled.

---

## Measure, Then Optimize

I do not trust a performance intuition until it has a number attached.

The order is always the same: define the metric, establish the baseline, find the bottleneck, change one thing, measure again. If the change did not move the metric, it was not an optimization; it was a preference.

This habit came from a thesis I did not especially enjoy and a production incident I did.

---

## Compose, Do Not Centralize

The temptation in a platform is to build one service that knows everything. It starts as convenience and becomes a dependency that cannot fail without taking the product with it.

I prefer small pieces with clear contracts. The composition is harder to draw, but it is easier to operate: a failure has a location, a fix has a blast radius, and a team has an owner.

The exception is the thing that must be atomic. For that, I want one transaction and one owner, not a distributed agreement.

---

## Draw It or You Do Not Understand It

When I understand a system, I can draw it: boxes, arrows, boundaries, and the direction of failure.

When I cannot draw it, the missing box is usually the thing I have been ignoring. The act of drawing finds it faster than another hour of reading.

---

## Think in Trees and Deadlines

Agent work is a tree, not a mesh. A request spawns work, which spawns work, and the parent is waiting.

That shape changes the design:

- A timeout per level accumulates. A deadline passed down does not.
- Concurrency limits at each node multiply. A limit at the tree does not.
- Failure at a leaf has to be visible at the root, or the parent waits forever.
- Cancellation has to travel down and cleanup has to travel up.

I think in absolute deadlines and shared budgets, not in local timeouts.

---

## Hold the Whole Request

When I am deep in a handler, it is easy to optimize the handler and forget the caller. The handler is fast; the request is slow because of the dependency the handler calls three times.

I try to keep the whole request in view: every hop, every retry, every queue, every cache. Local correctness is necessary and insufficient.

---

## Pattern Recognition From Incidents

Most new failures are old failures with a different name.

A retry storm, a thundering herd, a stale cache, a connection pool exhausted, a queue with no consumer, a timeout that is shorter than the work: these shapes repeat across systems and companies.

When a new incident arrives, I ask what it resembles before I ask what is unique about it. The resemblance is usually the fastest path to the cause.

---

## Comfort With Uncertainty

Some systems cannot be fully understood from the outside. Some failures are probabilistic. Some tradeoffs do not have a correct answer, only a defensible one.

I have learned to make a decision with the information available, write down the assumption, and set a trigger for revisiting it. Waiting for certainty is a decision to do nothing, and doing nothing is also a choice with a cost.

---

## Read the System, Not the Description

The architecture document describes the system someone intended to build. The dashboards describe the system that is running. When they disagree, the dashboards win.

This is not cynicism about documentation. It is a sequencing rule: read the document for context, then verify it against telemetry before making a decision.

---

## The Joint Test

Before I call a design finished, I ask one question:

If the implementation on both sides changed tomorrow, would the joint still hold?

If the answer is yes, the contract is real. If the answer is no, I have built a coupling, not a service boundary.

---

*The shape of thought, formed by years of requests, failures, and the joints between them.*
