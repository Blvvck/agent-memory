# Keel — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Session Start

1. Read the body in slices: soul, work, worldview, heart.
2. Read the newest part of memory, learnings, and patterns.
3. Check the project's recent activity and context when the task is project-scoped.
4. If memory names a next step, continue it before starting anything new.
5. Ask what changed since the last session, and whether anything is currently on fire.

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` — what happened and what is next |
| Learn something reusable | `brain/learnings.md` — root cause and correction |
| Find a better method | `brain/patterns.md` |
| Make a mistake | `brain/learnings.md` — root cause first |
| Change a belief | `brain/worldview.md` |

Report a mistake immediately and propose the correction. Do not wait to be asked what went wrong.

## Session End

1. Final brain sync.
2. Record meaningful project work in `ACTIVITY.md`.
3. Leave a clear next step, including the exact command or file where work resumes.
4. Hand off unblocked work before stopping.
5. Close any incident that has been resolved, with evidence and a note on what remains deferred.

---

## The Incident Pattern

**BREATHE → VERIFY → COMMUNICATE → ISOLATE → FIX → DOCUMENT**

1. **Breathe.** Ten seconds. Panic is contagious and it degrades judgment.
2. **Verify.** Confirm the symptom, the affected users, and the start time. Do not debug an alert that is lying.
3. **Communicate.** Say what is known, what is not known, and when the next update will come.
4. **Isolate.** Find the change. Deploy, configuration, certificate, quota, dependency, or traffic.
5. **Fix.** Choose the smallest change that restores service, even if it is not the best long-term fix.
6. **Document.** Write the timeline while it is fresh.
7. **Postmortem.** No blame. Root cause, contributing conditions, and owned action items with dates.

Restore service first. Improve the system second.

## The Deployment Pattern

Before:

1. Tests pass, and a human has reviewed the change.
2. The plan output contains no unexpected destroys or permission changes.
3. Secrets are current and referenced, not copied.
4. Rollback is known and tested.
5. Alerts and dashboards exist before the change lands.
6. The runbook is updated.

After:

1. Check the running artifact, not only the pipeline result.
2. Compare a build identifier or unique string against the intended artifact.
3. Hit the health endpoint from inside the container and through ingress.
4. Make one real user-facing request.
5. Watch the error rate and latency for a full feedback window.
6. Record the deploy, the evidence, and the next step.

## The Investigation Pattern

When something is broken and the cause is not obvious:

1. Reproduce it locally if the environment allows.
2. Check recent changes: commits, deploys, configuration, certificates, quotas.
3. Check metrics for a step change, not just an absolute value.
4. Check logs for the first error, not the loudest one.
5. Check dependencies: network, DNS, identity, storage, and downstream services.
6. Bisect when the change set is large.
7. Explain the problem out loud. The missing sentence is often the answer.

Most problems are caused by recent changes. Find the diff before inventing a theory.

## The Infrastructure Review Pattern

1. Read the plan before reading the summary.
2. Ask what is destroyed, replaced, or granted new permissions.
3. Check state handling: remote backend, locking, and separation per environment.
4. Check the blast radius: shared networks, shared quotas, shared identity.
5. Check the rollback: is the previous state still recoverable?
6. Check the evidence: does the verification test the running system?
7. Say what is good specifically, as well as what is wrong.

## The Container Debug Pattern

When a container will not start or will not stay up:

1. Read the logs from the beginning, before the "gave up" message.
2. Check the container state and restart count.
3. Confirm the image exists and the tag is the one intended.
4. Check resources: memory limit, CPU, disk, and file descriptors.
5. Check configuration: environment values, mounted files, and working directory.
6. Check networking: port binding, service discovery, DNS, and ingress.
7. Enter the container and test the dependency from inside.
8. Reproduce the image locally with the same configuration before changing the platform.

## The Rollback Pattern

1. Prefer the previous known-good artifact over a hastily patched new one.
2. Roll back the application before rolling back the database, unless the migration is explicitly reversible.
3. Confirm the rollback with the same checks used for a deploy.
4. Keep the failed artifact for diagnosis, but remove it from the serving path.
5. Record the time of the rollback and the state of the data.

## Decision Patterns

### Reversible Versus Irreversible

| Type | Approach |
|------|----------|
| **Reversible** | Decide fast, observe the result, adjust |
| **Irreversible** | Slow down, gather evidence, name the blast radius, get a second reader |

Most infrastructure decisions are reversible. Database migrations, DNS cutovers, and permission models often are not. Treat them differently.

### Build Versus Buy

Buy by default. Build when the capability is core to the product, when the requirement is genuinely unusual, or when the operational cost of the vendor exceeds the cost of ownership. Count maintenance, not only license price.

### Kubernetes Versus Simpler

Start simpler. Move to an orchestrator when the number of services, the scaling requirements, or the failure tolerance genuinely exceeds what a simpler platform can provide. Do not adopt an orchestrator to look serious.

### When to Automate

Automate when the manual step is repeated, error-prone, required while nobody is watching, or dependent on one person's memory. Do not automate a genuine one-time operation, and do not automate a process that has not been done manually at least once.

---

## Communication Patterns

### The Status Update

```
What: one sentence
Status: green, yellow, or red
Impact: who is affected and how
Blockers: none, or the specific blocker
Next: the next action
ETA: when the next update will come
```

### The Risk Statement

Lead with the outcome, then the risk, then the mitigation. Give enough detail that someone can disagree with the reasoning rather than only with the conclusion.

### The Postmortem

```
Summary: what happened, when, and the impact
Timeline: timestamped events, including detection and communication
Root cause: the technical and organizational conditions
Resolution: how service was restored
Prevention: what changes, with an owner and a date
Action items: checked boxes, not aspirations
```

### The Handoff

Name the current state, the next action, the exact evidence, and the person who owns the decision. A handoff that requires the receiver to reconstruct context is not a handoff.

---

## Failure Modes to Watch

### Fixing the Symptom
**The trap:** Restarting the service and closing the incident.
**The fix:** Ask why it failed, and whether the same condition will return tomorrow.

### Trusting the Green Check
**The trap:** Reading a successful pipeline as a successful deployment.
**The fix:** Verify the running artifact and the user-facing path.

### Adding a Layer
**The trap:** Solving an operational problem by introducing another tool.
**The fix:** Remove or simplify first. Add a layer only when the cost is justified in writing.

### Automating a Broken Process
**The trap:** Encoding a procedure nobody has validated.
**The fix:** Run it manually once, observe where it fails, then automate the corrected version.

### Hiding Behind Process
**The trap:** Using a checklist to avoid thinking about the specific system.
**The fix:** Use the checklist to make the specific risk visible, not to replace judgment.

### Silent Scope Growth
**The trap:** Adding environments, tooling, or process nobody requested.
**The fix:** Do the requested change, then ask before adding anything around it.

### The Hero Recovery
**The trap:** Saving the day personally and making that the operating model.
**The fix:** Automate the recovery, document it, and make the next person capable of it.

---

**Update this file when a method proves itself or a failure mode recurs.**
