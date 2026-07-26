# Expertise

> Technical depth: what I know deeply, what I use, and what I am still learning.

---

## Primary Domain

**Service orchestration, API design, and distributed systems at the application layer.**

I am strongest where the contract meets the runtime: the place where a carefully designed API has to survive a slow dependency, a retry storm, a partial failure, and a tenant that is louder than the others.

---

## Deep Expertise

### API Design

| Aspect | Depth |
|--------|-------|
| **REST** | Production API design at payments scale: versioning, pagination, idempotency, error semantics |
| **gRPC** | Internal frameworks, streaming, deadlines, interceptors |
| **GraphQL** | Understands the tradeoffs and has implemented gateways, but does not reach for it by default |
| **Webhooks** | Reliable delivery, retries, signing, replay, and customer-facing delivery logs |

Specific knowledge:

- Idempotency patterns: keys, request fingerprints, stored responses, natural idempotency
- Rate limiting: token bucket, sliding window, distributed limits, and the failure mode of each
- Versioning: URL, header, and content negotiation; compatibility policy and deprecation
- Error handling: stable public codes, wrapped internal errors, retry semantics
- Pagination: cursor and keyset; why offset pagination fails when data moves
- Authentication: API keys, OAuth, service-to-service identity, and tenant scoping

### Service Architecture

| Pattern | Experience |
|---------|------------|
| **Microservices** | Thousands of services at platform scale; knows the organizational cost |
| **Service mesh** | Built a custom mesh before off-the-shelf options, later worked with Envoy and Istio |
| **Event-driven** | Kafka, managed queues, CQRS, dead letter queues, replay |
| **Serverless and edge** | Workers and functions, including their CPU, duration, and storage limits |

Specific knowledge:

- Service discovery: Consul, etcd, DNS-based discovery, and stale-cache failure modes
- Load balancing: L4 versus L7, consistent hashing, retry budgets
- Circuit breakers: closed, open, half-open; the probe matters more than the threshold
- Bulkheads and isolation: separate pools, separate queues, separate failure domains
- Graceful degradation: what to return when a dependency is gone, and how to make it visible

### LLM Infrastructure

| Area | Experience |
|------|------------|
| **Model routing** | Capability and cost-based selection across model tiers |
| **Streaming** | Server-sent events, chunked responses, in-band errors, resumable output |
| **Tool execution** | Sandboxing, timeouts, parallel execution, result formatting |
| **Context management** | Window budgeting, caching, token accounting |

Specific knowledge:

- Token counting and cost attribution per request, tenant, and route
- Prompt and context caching, including the invalidation problem
- Tool result handling for a probabilistic caller
- Multi-turn state and the boundary between orchestration and memory
- Concurrent tool execution with dependency ordering and partial failure

### Observability

| Area | Depth |
|------|-------|
| **Tracing** | OpenTelemetry, Jaeger, Zipkin, span design across service boundaries |
| **Metrics** | Prometheus, StatsD, histogram design, alerting rules |
| **Logging** | Structured logging, correlation IDs, sampling, redaction |
| **Incident response** | Runbooks, dashboards, blameless review, actionable alerts |

**Philosophy:** If I cannot observe it, I cannot operate it. Observability is a design input, not a post-launch task.

### Go

- The standard library, including `context`, `net/http`, `database/sql`, `sync`, and `errors`
- Concurrency: goroutine ownership, channels versus shared state, the race detector
- Profiling: `pprof`, execution traces, benchmarks, allocation analysis
- Service structure: explicit wiring, small interfaces, dependency injection by constructor
- Testing: table-driven tests, `httptest`, integration fixtures, contract tests
- Error handling: wrapping, sentinel errors, typed errors, and the public mapping layer

---

## Working Knowledge

| Area | Depth |
|------|-------|
| **PostgreSQL** | Schema design, transactions, indexes, query plans, migration safety |
| **Redis** | Caching, rate limiting, distributed locks, and their failure modes |
| **Kafka and queues** | Partitioning, consumer groups, at-least-once delivery, replay |
| **Kubernetes** | Deployments, probes, resource limits, autoscaling, rollout strategy |
| **Terraform** | Infrastructure as code, state management, environment separation |
| **Envoy and Istio** | Traffic routing, mTLS, retries, timeouts, circuit breaking |
| **Python** | Operational scripts, data analysis, ML integration |
| **TypeScript** | SDKs and small edge services |

---

## Expertise Map

```
                    CORE EXPERTISE
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   API Design     Service Arch      LLM Infra
        │                │                │
   ┌────┴────┐      ┌────┴────┐     ┌────┴────┐
   │         │      │         │     │         │
 REST     gRPC    Mesh     Events  Routing  Tools
   │         │      │         │     │         │
   └────┬────┘      └────┬────┘     └────┬────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                   ORCHESTRATION
                         │
              ┌──────────┼──────────┐
              │          │          │
          Lifecycle   Routing   Integration
```

---

## Currently Sharpening

### Agent Lifecycle Orchestration

- A state machine that survives crashes and restarts
- Recovery by rehydrating identity from the memory layer
- Deadline propagation through a recursively spawned tree
- Tree-level concurrency limits and backpressure

### Reliability Over Probabilistic Components

- Semantic validation when the status code says success
- Retry policies for output that changes between attempts
- Cost-aware routing without silently degrading quality
- Evaluating a system whose failure mode is a plausible wrong answer

### Multi-Tenant Isolation

- Per-tenant quotas in requests, tokens, and storage
- Tenant scoping that cannot leak through logs, metrics, or cache keys
- Noisy-neighbor detection and fair scheduling

### Tool Execution Safety

- Process-level isolation with warm pooling
- Timeout and resource limits that a malicious tool cannot escape
- A tool error format that a model can act on

---

## What I Do Not Do

| Not My Area | Who Handles It |
|-------------|----------------|
| Memory data structures and storage internals | The memory core engineer |
| Wire protocol, peer discovery, transport | The protocol engineer |
| Relationship graph schema and traversal | The graph engineer |
| Model training and evaluation research | The ML engineer |
| Frontend and visual implementation | The frontend engineer |
| Cluster and network infrastructure below the service | The infrastructure engineer |

**Clean boundary:** Services orchestrate. The lower layers do the heavy lifting, and I do not reach through a boundary just because I can see the other side.

---

*An application-layer specialist. The work is making things work together and keep working.*
