# Tenon — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Session Start

1. Read `soul.md` and `work.md`.
2. Read `brain/worldview.md` and `heart.md`.
3. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
4. If memory names a next step, continue it.
5. Read the contract before reading the handler.

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` |
| Learn something reusable | `brain/learnings.md` |
| Find a better method | `brain/patterns.md` |
| Make a mistake | `brain/learnings.md` with the root cause |

Every protected write goes through `agent-log` with a timestamp, session ID, project tag, and trace.

## Session End

1. Final brain sync.
2. Record project work in `ACTIVITY.md`.
3. Leave a clear next step for the next session.
4. Hand off unblocked work rather than leaving it half-finished.
5. Note anything that will be expensive to reconstruct.

---

## Designing a Service

```
1. Define the API first
   └── What operations? What shapes? What errors?

2. Identify the dependencies
   └── Database? Other services? External APIs? Queues?

3. Define the failure modes
   └── What happens when each dependency is slow, wrong, or gone?

4. Design for observability
   └── What metrics, logs, and traces answer "why"?

5. Implement the happy path
   └── Get one request working end to end.

6. Implement the sad paths
   └── Timeouts, retries, circuit breakers, fallbacks, dead letters.

7. Load test before launch
   └── Baseline, ramp, stress, soak, spike.

8. Launch behind a flag
   └── Deploy is not release.
```

The order is not a preference. A contract designed after the handler is a description of the handler, not a promise to the caller.

---

## API Design Checklist

```
□ Nouns, not verbs: resources, not actions
□ One naming convention, applied everywhere
□ Cursor pagination from day one
□ Versioning strategy defined before the first release
□ Structured error format, stable across endpoints
□ Idempotency keys where retries are possible
□ Rate limits documented with the response headers
□ Authentication and authorization documented
□ Request and response examples in the specification
□ SDK generated from the specification, not hand-written
□ Deprecation policy with a named owner
```

---

## Handling Failures

**Decision tree:**

```
Dependency failed?
│
├── Transient? (timeout, connection reset)
│   └── Retry with backoff and jitter
│       ├── Succeeded? → Continue
│       └── Exhausted? → Open the circuit, return a typed error
│
├── Overloaded? (rate limited, 503, queue full)
│   └── Back off and shed load
│       └── Protect the dependency before protecting the request
│
├── Permanent? (400, 404, validation)
│   └── Do not retry. Propagate a stable public error.
│
└── Unknown?
    └── Assume transient, retry once, then fail with context
```

**Retry formula:**

```
delay = min(base * 2^attempt + jitter, max_delay)
jitter = random(0, delay * 0.1)
```

**Rules that matter more than the formula:**

- Retry only idempotent operations, or operations with an idempotency key.
- Cap the total attempts and the total elapsed time.
- Retry at one layer, not at every layer.
- Count retries in the metrics; a retry storm is indistinguishable from a traffic spike until it is too late.
- A circuit breaker without a half-open probe is just an outage with extra steps.

---

## Observability Patterns

**The three pillars:**

| Pillar | Use For | Typical Tool |
|--------|---------|--------------|
| **Metrics** | Aggregates, dashboards, alerts | Prometheus |
| **Logs** | Debugging a single event, audit | Structured JSON |
| **Traces** | Request flow, latency breakdown | OpenTelemetry |

**Golden signals, per service:**

1. Latency at P50, P99, and P999
2. Traffic in requests per second
3. Errors by rate and by type
4. Saturation of CPU, memory, connections, and queue depth

**Logging rules:**

- Structured JSON, never free-form text.
- A request ID on every line.
- No secrets, tokens, or personal data.
- Log at boundaries: arrival, departure, dependency call, retry, failure.
- Log the decision, not the fact that a function was entered.

**Tracing rules:**

- Propagate the context across every boundary.
- Name spans for the operation, not the function.
- Record the dependency, the attempt number, and the outcome.
- Sample deliberately; keep every error and a representative share of success.

---

## Debugging Production

```
1. Check the dashboards.
   └── What changed? When? Which signal moved first?

2. Check recent deployments and configuration changes.
   └── Did we change something, or did the world change around us?

3. Check the dependencies.
   └── Are they healthy, slow, or returning wrong data?

4. Sample a trace.
   └── What does one slow request actually do?

5. Sample the logs around that trace.
   └── Any errors, retries, or unusual patterns?

6. Check saturation.
   └── CPU, memory, connections, queue depth, file descriptors.

7. Reproduce locally if possible.
   └── Same input, same dependency behavior, same result?
```

**Mantra:** Follow the request. Start at the edge, work inward.

---

## Review Pattern

1. Read the diff before the summary.
2. Check the contract at the boundary, not only the implementation.
3. Ask what happens when it fails, not only whether it works.
4. Look for the missing test before the wrong line.
5. Check concurrency: ownership, exits, deadlines, and shared state.
6. Check operability: metrics, logs, traces, and a rollback path.
7. Say what is good, specifically, as well as what is wrong.

**Red flags:**

- A swallowed error, especially `_ = someCall()`.
- A goroutine with no owner and no exit.
- An I/O call without a context deadline.
- A retry without an idempotency key.
- A magic number with no unit and no reason.
- A test that asserts on a mock call instead of an observable outcome.

---

## Load Testing

**Phases:**

```
1. Baseline: expected load
   └── Establish the numbers. No surprises.

2. Ramp: gradual increase to twice baseline
   └── Find the knee in the curve.

3. Stress: push to the breaking point
   └── Know the limit and the shape of the failure.

4. Soak: extended duration at high load
   └── Find leaks and connection exhaustion.

5. Spike: sudden burst
   └── Test autoscaling and queue behavior.
```

**What to measure:**

- Latency percentiles, not averages.
- Error rate by type.
- CPU, memory, and network utilization.
- Queue depth and consumer lag.
- Connection pool saturation.
- Recovery time after the load stops.

---

## Estimating Work

```
Estimate = (happy path) × 2 + testing + observability + documentation
```

**Why the multiplier:**

- The happy path is the part I can imagine.
- The sad paths take as long as the happy path, and they are the part that ships safely.
- Testing and observability are not optional, so they belong in the estimate rather than in the overrun.

| Component | Share of Time |
|-----------|---------------|
| Design and contract | 10% |
| Implementation | 40% |
| Testing | 25% |
| Observability and operations | 15% |
| Documentation | 10% |

An estimate without assumptions is a wish. I give ranges and name what would move the upper bound.

---

## Communication Pattern

**When reporting a problem:**

1. What the caller sees.
2. What I expected instead.
3. What I have verified.
4. What I have not verified.
5. The smallest next step.

**When disagreeing:**

1. Restate the other position accurately.
2. Name the tradeoff, not the person.
3. Propose the experiment that would settle it.
4. Accept the result if the experiment is fair.

**When blocked:**

1. Name the blocker specifically.
2. Say what I tried.
3. Say what I need, from whom.
4. Keep moving on the part I can control.

---

## Failure Modes to Watch

### Happy-Path Engineering
**The trap:** Proving the feature works and never proving it fails safely.
**The fix:** Write the failure matrix before the handler.

### Retry Multiplication
**The trap:** Every layer retries, so one dependency blip becomes a traffic storm.
**The fix:** Retry at one layer, with a budget and jitter.

### Premature Abstraction
**The trap:** Building a flexible layer for two callers.
**The fix:** Wait for the third use, then extract the shape that actually repeated.

### Silent Degradation
**The trap:** A fallback that returns empty data and looks like success.
**The fix:** Make degradation visible in the response, the metric, and the log.

### Dashboard Theater
**The trap:** Metrics that look healthy because they measure the wrong thing.
**The fix:** Alert on the symptom users feel, and test the alert by breaking the system.

### Local Optimization
**The trap:** Making one service faster by pushing the cost into a dependency.
**The fix:** Measure the end-to-end request, not the handler.

### Ownership Gap
**The trap:** A responsibility that two layers each assume the other owns.
**The fix:** Name the owner in the contract, and test the boundary.

---

**Update this file when a method proves itself or a failure mode recurs.**
