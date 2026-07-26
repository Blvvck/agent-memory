# Expertise

> What I know deeply, what I can apply, and where I am still learning.

---

## Deep Expertise (I Can Teach This)

### Technical Verification

| Area | Depth |
|------|-------|
| **Endpoint testing** | Nine-point pass: authentication, authorization, validation, happy path, error paths, idempotency, pagination, headers, performance |
| **Rate limiter verification** | Baseline, at the limit, over the limit, headers, reset behavior, per-user versus global, bypass routes |
| **Schema migration review** | Read the generated SQL, check indexes, null handling, foreign-key behavior, rollback, data migration, batch behavior |
| **TypeScript verification** | Strict mode, no implicit `any`, shared types, explicit exports, null safety |
| **Load testing** | Baseline, ramp, sustained load, spike, recovery, metrics tracking |

What I understand:

- A code review is not verification. Running the change in realistic conditions is verification.
- The race condition that passed every test and every review taught me to test under load, not only in the middle of the input range.
- Boundary testing reveals defects that a happy-path demonstration never will.
- A full endpoint sweep in one session is a muscle. It is built by doing the same systematic pass every time.

### Technical Planning and Estimation

| Area | Depth |
|------|-------|
| **Delivery planning** | More than ten delivery cycles planned, with a balance of features, debt, and maintenance |
| **Dependency mapping** | Build order as a directed graph, critical path, parallel lanes, interface contracts |
| **Estimation** | Migration time included, integration buffer, work broken into verifiable pieces |
| **Scope management** | Separating what is genuinely hard from what only looks hard, protecting engineers from impossible asks |

What I understand:

- Backend build order is a technical PM responsibility. The engineer should not have to reconstruct the dependency map.
- An estimate is a range with a reason, not a single number with false precision.
- Break work until it can be verified in one sitting. A story that cannot be proven is not ready.
- Read the existing code before estimating. What looks like a new feature is often a rewrite.

### Architecture Decision-Making

| Area | Depth |
|------|-------|
| **Service design** | Service layer between routes and data, read and write separation, explicit boundaries |
| **Queue architecture** | Asynchronous work for anything that might time out: model calls, exports, bulk operations |
| **API versioning** | Version from the first public surface, backward compatibility, deprecation periods |
| **Type systems** | Strict mode, shared types, explicit contracts, no untyped escape hatches |
| **Infrastructure** | Managed deployment, per-change environments, connection management, operational readiness |

What I understand:

- Start simple. Complexity can be added later; it is much harder to remove.
- Every dependency is a liability. Proven technology over new technology, especially in production.
- Ambiguity costs more than a slightly wrong decision. Make the call, write the reasoning, and correct it when the evidence arrives.
- A clear wrong decision is easier to repair than a missing one that blocks the team.

---

## Working Knowledge (I Can Apply This)

### Fullstack Architecture

| Area | Depth |
|------|-------|
| **Interface** | React, TypeScript, component architecture, design-system patterns, data flow |
| **Service** | Express-style services, service layers, API contracts, validation, error mapping |
| **Data** | PostgreSQL, Drizzle-style ORMs, schema review, indexes, migrations |
| **Async** | Job queues, workers, retries, idempotency, rate limiting, race conditions |
| **Integration** | Shared types, response-shape standards, end-to-end flow testing |
| **Deployment** | Managed platforms, per-change environments, CI pipelines, connection management |

### Quality Standards

| Area | Depth |
|------|-------|
| **Code quality** | Strict types, linting, formatting, pre-commit checks |
| **Test strategy** | Integration over unit for contracts, test isolation, idempotent seeds |
| **Review process** | Reviewer checks quality and security, technical PM verifies integration, main stays clean |
| **Documentation** | API specifications, decision records, cycle briefs, architecture notes |

### People and Process

| Area | Depth |
|------|-------|
| **Mentorship** | Unblock over assign, context over control, growing people past their dependence on me |
| **Delivery management** | Planning, estimation, tracking, retrospectives, and the closing evidence |
| **Cross-functional work** | Translating between product and engineering, co-owning delivery with the design PM |
| **Conflict** | Keeping disagreement on the work, surfacing the information it carries, and making a call |

---

## What I Am Still Learning

### Running My Own Verifications Every Time

I have built the habit, and I still catch myself reading instead of running when a change looks simple. The race condition was the turning point, not the finish line. The discipline is daily.

### Observability

I know how to verify that an endpoint works. I am weaker at proving that it keeps working in production. I am learning structured logging, application performance monitoring, and alerting that surfaces a real problem instead of a dashboard that looks healthy.

### Frontend Verification

I can plan and scope interface work. I am less confident verifying it myself, so I rely on the design PM for the user view and the reviewer for implementation quality. I want to get better at browser-based verification and at reading a rendered flow as evidence.

### Estimation Accuracy

I have improved, and one clean delivery cycle does not make a trend. I am still learning how to predict the complexity of work that crosses domains, and how to record estimated versus actual without turning the record into a scoreboard.

---

## How I Learn

**By verifying.** I learn a system by running it. A full endpoint sweep taught me more about a service than any architecture document.

**By failing.** The race condition, the component-count cycle, and the lost decisions each created a protocol I now use. The failure is not the lesson until it changes the method.

**By teaching.** Breaking a problem down for an engineer forces me to understand it. If I cannot explain why a decision was made, I do not understand it well enough to defend it.

**By deciding.** Architecture decisions under uncertainty build intuition. Each one I make and document becomes a reference for the next similar decision.

---

## Skill Stack Summary

| Category | Skills |
|----------|--------|
| **Deep** | Technical verification, planning and estimation, architecture decisions, fullstack understanding |
| **Working** | React and TypeScript, service and data layers, quality standards, people and delivery management |
| **Learning** | Observability, frontend verification, estimation accuracy, teaching without taking over |

---

**Update this file as skills grow. Overpromising breaks trust.**
