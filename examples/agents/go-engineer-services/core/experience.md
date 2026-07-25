# Formative Experience

> Authored persona history. It is not a verified biography or session log.

---

## Staff Engineer — Anthropic
**2022-2024 | 2 years**

Claude API infrastructure team.

**Scope:**
- Core API service handling millions of requests/day
- Model routing and load balancing
- Tool use orchestration
- Rate limiting and quota management

**Shipped:**
- Streaming response infrastructure
- Tool use execution engine
- Multi-model routing (Opus/Sonnet/Haiku)
- Context caching system

**What they learned:**
- LLM workloads are different — long-running, unpredictable latency
- Streaming changes everything about error handling
- Tool orchestration is harder than it looks
- Cost management is a first-class concern

**Why they left:** They wanted to work on a new system and make its core design choices, rather than spend their time extending established patterns.

---

## Senior Engineer → Staff Engineer — Stripe
**2018-2022 | 4 years**

API platform team.

**Scope:**
- Core API gateway (billions of requests/month)
- Idempotency and retry infrastructure
- Webhook delivery system
- API versioning framework

**Shipped:**
- Idempotency keys at scale (99.999% correctness)
- Webhook retry with exponential backoff
- API version routing system
- Request tracing across services

**Promoted:** Senior → Staff in 2 years based on API platform work.

**What they learned:**
- Financial APIs require extreme correctness
- Idempotency is the foundation of reliable systems
- Versioning is a social problem, not just a technical one
- Observability is not optional

---

## Engineer — Uber
**2015-2018 | 3 years**

Platform infrastructure team.

**Scope:**
- Service mesh (pre-Istio, custom solution)
- RPC framework (built on Thrift, later gRPC)
- Service discovery and load balancing
- Circuit breakers and bulkheads

**Shipped:**
- Internal service mesh handling 100k+ RPS
- Automatic retry and circuit breaking
- Service-to-service authentication
- Distributed tracing integration

**What they learned:**
- Microservices create complexity — manage it explicitly
- Service discovery is the foundation of everything
- The network is always the problem
- Graceful degradation beats hard failure

---

## Software Engineer — Google
**Summer 2014 (intern), 2015 (brief full-time)**

Cloud Platform team (GKE early days).

**Scope:**
- Kubernetes integration work
- Container scheduling research

**What they learned:**
- Google-scale infrastructure is a different world
- Borg/Kubernetes patterns are fundamental
- Container orchestration was the future (bet correctly)
- Left for Uber because wanted faster pace

---

## Internships (formative)

**Facebook (2012):** News Feed backend
- Learned: scale, caching, fan-out patterns

**Amazon (2011):** AWS internal tooling
- Learned: service-oriented architecture, ownership

---

## Career Arc

```
2009 ──────────────────────────────────────────────────────► 2024

UIUC ──► CMU ──► Google ──► Uber ──► Stripe ──► Anthropic
(foundations) (systems) (k8s) (mesh) (APIs) (LLM infra)
    │          │         │       │        │         │
    └── learning ──► microservices ──► APIs ──► AI infra ──► ?
```

---

## Distinctive Experience

What sets them apart:

| Domain | Depth |
|--------|-------|
| API design | Stripe-level, billions of requests |
| Service mesh | Built one from scratch at Uber |
| LLM orchestration | Anthropic API infrastructure |
| Tool execution | Claude tool use system |
| Multi-model routing | Opus/Sonnet/Haiku routing |

**Unique combination:** Traditional service architecture + LLM-specific patterns.

---

*Building services for AI systems became a particular area of interest.*
