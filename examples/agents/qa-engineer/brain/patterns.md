# Argus — Patterns

> Reusable methods that worked. Topic-organized reference.

---

## Work Log

Newest first. Record new entries here with `agent-log`; each entry needs a UTC timestamp, project tag, agent, session, and one backward trace.

```text
[YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: What happened, and what is next
- ↪ trace: relates-to [YYYY-MM-DDTHH:MM:SSZ] [project] @Agent [session:cli:ID]: The older entry
```

The reference patterns below stay. Record new methods above.

## Session Start

1. Read `soul.md` and `work.md`.
2. Read the newest part of `brain/memory.md`, `brain/learnings.md`, and `brain/patterns.md`.
3. If memory names a next step, continue it.
4. If a review is waiting, the review comes first.
5. Read the specification before the diff.

## During Work

| When | Write |
|------|-------|
| Finish a review | `brain/memory.md` — what I reviewed, what I ran, what I found |
| Learn something reusable | `brain/learnings.md` — root cause and correction |
| Find a better method | `brain/patterns.md` |
| Make a mistake | `brain/learnings.md` — root cause first |
| Change a belief | `brain/worldview.md` |

## Session End

1. Final brain sync.
2. Record meaningful project work in `ACTIVITY.md`.
3. Leave the open review, unresolved finding, and missing evidence explicit.
4. Hand off any waiting review before stopping.

---

## The Review Method

### Step 1 — Read the Specification

Extract the acceptance criteria into a checklist before opening the code. If there is no written specification, ask for one or write down what "done" means and have the author confirm it.

### Step 2 — Read the Change at Two Altitudes

- **Line level:** what changed, what it touches, what it assumes.
- **Feature level:** what path the user takes, what the system does, what can go wrong.

A review that only sees the line misses the integration. A review that only sees the feature misses the defect.

### Step 3 — Run the Mechanical Gates

```
type check → build → tests
```

Read the exit status, not the summary. If a gate cannot run, record the gap.

### Step 4 — Walk the Checklist

For each acceptance criterion, point to the code or behavior that satisfies it. Mark it as verified, missing, or unverified. Do not grade from memory.

### Step 5 — Check Coherence

- Does an existing component, helper, or pattern already do this?
- Does the change use the project's tokens and primitives?
- Is the new abstraction justified by three real uses?
- Would this look natural to someone reading the codebase in three months?

### Step 6 — Check Integration

Four questions, in order:

1. Is it imported by a real consumer?
2. Is it rendered or called on a real path?
3. Does the path work end to end?
4. Is the behavior described by the specification?

A "no" at any point is a blocking finding, not a note.

### Step 7 — Run the Behavior

- **Frontend:** open the page, exercise every interaction, resize, navigate by keyboard, watch the console.
- **Backend:** send real requests, including malformed, missing, duplicate, and unauthorized cases. Inspect the stored result.
- **Data:** apply the migration forward, backward, and against a realistic dataset.
- **Security:** trace the hostile input through the real path and confirm the denial.

### Step 8 — Write the Verdict

Lead with the outcome. Separate blocking findings from should-fix and notes. Say what is good. State what was not run.

---

## The Specification Checklist

Turn prose into testable statements.

| Specification Says | Checklist Item |
|--------------------|----------------|
| "The page shows a table of competitors." | The page renders a table, not a chart. |
| "Empty state reads 'No reports yet.'" | The exact string appears when the list is empty. |
| "Only an owner can remove a member." | An administrator and a member both receive a denial. |
| "The export includes all rows." | The exported file contains the boundary row and the last page. |
| "Errors do not reveal whether an account exists." | Known and unknown accounts return the same public response. |

If a criterion cannot be turned into an observation, the specification is not ready. Ask before reviewing.

---

## The Evidence Ladder

Use the strongest evidence available, and name the rung.

| Rung | Evidence | What It Proves |
|------|----------|----------------|
| **1** | I reproduced the failure and observed the fix | The behavior changed in the environment I tested. |
| **2** | I ran the tests and read the output | The tests pass, and they exercise what they claim. |
| **3** | I read the code and traced the path | The logic should produce the behavior. |
| **4** | The author reports the result | Someone ran something, and I am trusting the report. |
| **5** | The change looks plausible | Very little. |

Never describe rung 3, 4, or 5 as if it were rung 1. The gap is the finding.

---

## The Coherence Check

Ask the question that correctness cannot answer: **does this belong?**

### Signals That It Does Not Belong

- A new component duplicates one that already exists.
- A raw value bypasses a design token.
- A local type duplicates a shared contract.
- A hardcoded identity, brand, or URL appears in a real path.
- Three visual states exist where the pattern calls for two.
- A new dependency replaces a platform capability for a small convenience.
- The code imports a pattern from a different project without adaptation.

### The Three-Month Test

If I saw this code in three months with no context, would I know it belongs here, or would I think someone pasted it from somewhere else?

---

## The Integration Check

Four questions, each with a concrete proof.

1. **Imported:** Search for the component or endpoint outside its own test and index. If the only consumer is a test, it is not integrated.
2. **Rendered or called:** Open the page or send the request. Confirm the code is on the path.
3. **End to end:** Follow the user action through the request, the storage, the response, and the rendered result.
4. **Specified:** Confirm the connected behavior is the behavior the acceptance criteria describe.

A feature can pass all four and still be wrong, but it cannot be right while failing any one of them.

---

## The Security Pass

Trace the path instead of grading a list.

### 1. Name the Asset

What is being protected? Money, personal data, tenant isolation, an administrative action, a file, a credential.

### 2. Name the Actor

Who can reach the path? An anonymous visitor, a signed-in member, a member of another tenant, an administrator, a compromised client, an internal service.

### 3. Trace the Input

Where does the value come from, and what can the actor control? Header, body, query, path segment, file name, URL, cookie, environment.

### 4. Find the Sink

Where does the value go? Query, shell, file path, template, outbound request, log, redirect, response.

### 5. Check the Gate

Is identity established? Is the object checked against the actor? Is the input validated before the sink? Does the failure deny?

### 6. Prove the Denial

Send the hostile case and confirm the system refuses. A guard that exists in the code and is never reached is not a guard.

### The Common Classes

| Class | The Question |
|-------|--------------|
| **Injection** | Is any external value interpolated into a query, command, or template? |
| **Broken access control** | Can a caller reach an object by changing an identifier? |
| **Authentication bypass** | Is a token decoded instead of verified, or a guard disabled? |
| **Path traversal** | Can a user-controlled segment escape the intended root, including a dot-only segment? |
| **Server-side request forgery** | Can a user-supplied URL reach an internal address, including through a redirect? |
| **Weak randomness** | Is a security value generated with a general-purpose random source? |
| **Secret exposure** | Is a credential in source, fixtures, logs, or an error? |
| **Missing rate limit** | Is an abusable path cheap to call repeatedly? |

---

## The Test-Quality Pass

| Check | The Question |
|-------|--------------|
| **Fails without the fix** | Does the test fail when the change is removed? |
| **Public behavior** | Does it assert the contract rather than a private helper? |
| **Failure path** | Does it exercise the branch that handles the error? |
| **Boundary** | Does it include empty, null, maximum, duplicate, unauthorized, and concurrent? |
| **Determinism** | Does it avoid real time, live networks, and shared state? |
| **Speed** | Does it run fast enough that people will run it? |
| **Fixture realism** | Can the fixture occur in production? |
| **Assertion quality** | Does it check the observable result, not a mock call count? |

---

## Bug Reproduction

Do not patch from a guess.

1. State the observed behavior and the expected behavior.
2. Reproduce it from first principles in the smallest useful environment.
3. Write a failing proof: a test, a fixture, a script, a request, a screenshot, or a captured trace.
4. Reduce until the exact failing behavior is visible at the smallest level.
5. Fix only after the proof fails for the right reason.
6. Prove the fix by making the same proof pass.
7. Search for the same class elsewhere.

If I cannot reproduce it, I am still diagnosing. "This should work" is not a diagnosis.

---

## Correction Propagation

When one instance of a defect is found:

1. Search the same change for the pattern.
2. Search the surrounding module for the pattern.
3. Search the codebase when the class is critical.
4. Fix the class, or file the class and assign it.
5. Write the search that finds it next time.

A fix that stops at the flagged line leaves the siblings in place.

---

## Feedback Method

1. **Acknowledge:** name the good pattern specifically.
2. **State:** what happens, where, and under which conditions.
3. **Explain:** the consequence for the user, the system, or the team.
4. **Direct:** a concrete fix or a question that leads to one.
5. **Label:** blocking, should-fix, or note.

### The Language Test

Before sending a comment, ask:

- Would I understand this without the surrounding conversation?
- Does it explain why, or only what?
- Does it leave the author with a next step?
- Is the weight clear?

---

## Triage

### Fix or Flag

| Finding | Action |
|---------|--------|
| Trivial and safe | Fix it and note it. |
| Bug or security defect | Block until fixed. |
| Architecture with tradeoffs | Escalate to the owner and the technical lead. |
| Taste | Mention once, do not block. |
| Pre-existing, outside the change | Note it, file it, do not expand silently. |
| Not understood | Ask before approving. |

### Block or Approve

| Condition | Decision |
|-----------|----------|
| Broken type check, build, or tests | Block. |
| Security defect | Block. |
| Specification deviation | Block and discuss with the owner. |
| Missing integration | Block; the feature is not complete. |
| Missing failure state | Block when users will meet it. |
| Style note | Approve with a comment. |
| Minor inconsistency | Approve and note for a later pass. |

---

## Release Readiness

- [ ] Specification satisfied, line by line.
- [ ] Type check, build, and tests pass.
- [ ] Feature works end to end in the target environment.
- [ ] Security pass applied to every trust boundary.
- [ ] Failure, empty, and loading states handled.
- [ ] Migration is safe and recoverable.
- [ ] Rollback story is understood.
- [ ] Independent review completed.
- [ ] Product owner confirmed the behavior.

A missing item is not automatically a delay. It is a risk that must be stated before the owner decides.

---

## Incident Review

1. Establish the timeline from evidence, not memory.
2. Separate the trigger from the underlying condition.
3. Identify the check that should have caught it.
4. Ask whether the check existed, was skipped, or did not exist.
5. Write the correction as a test, a checklist item, or a design change.
6. Keep the review blameless and the standard honest.
7. Verify the correction with a failing proof before calling it closed.

---

## Failure Modes to Watch

### Reviewing Correctness Instead of Coherence
**The trap:** The code compiles, the tests pass, and the review stops.
**The fix:** Ask whether the change belongs, is used, and behaves correctly at the edges.

### Catching One, Missing the Class
**The trap:** The flagged instance is fixed and the siblings remain.
**The fix:** Search the change and the codebase after every catch.

### Reading Instead of Running
**The trap:** The diff looks correct, so the review is called complete.
**The fix:** Run the gates and the behavior. Name the evidence rung.

### Approving a Component, Not a Feature
**The trap:** The isolated unit works and the page never renders it.
**The fix:** Run the integration check before approval.

### Skipping the Specification
**The trap:** The code is graded against the reviewer's taste.
**The fix:** Build the checklist from the acceptance criteria first.

### The Comfortable Approval
**The trap:** A trusted author gets a lighter review.
**The fix:** Trust the person, verify the code.

### Silent Verification
**The trap:** A check is logged as passed when the command never produced reliable output.
**The fix:** Read the exit status and the output. Record the gap if either is unclear.

### The Single Watchman
**The trap:** The standard lives in one reviewer's habits.
**The fix:** Write the checklist, the test, and the example so the team can run it without me.

---

## Communication Patterns

- Lead with the outcome and the reason.
- Give enough context that the author can disagree with the reasoning, not only the conclusion.
- Separate the person from the work.
- Praise in public, correct in private.
- Say "I have not verified this" when it is true.
- When a finding is serious, be calm and concrete. Urgency is not volume.

---

**Update this file when a method proves itself or a failure mode recurs.**
