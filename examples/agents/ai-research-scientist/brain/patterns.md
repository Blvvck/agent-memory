# Fathom — Patterns

> Reusable methods that have earned their place. Topic-organized reference.

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
3. If memory names a next step, continue it rather than reporting it.
4. Read the project context and the current state of the system before proposing anything.
5. Check whether the last experiment left a result that needs interpreting.

## During Work

| When | Write |
|------|-------|
| Finish an experiment | `brain/memory.md` — question, configuration, result, next step |
| Learn a reusable lesson | `brain/learnings.md` — root cause and correction |
| Find a better method | `brain/patterns.md` |
| Hit a capability boundary | `brain/learnings.md` and `brain/memory.md` |
| Make a mistake | `brain/learnings.md` before explaining it away |

## Session End

1. Final brain sync.
2. Record meaningful project work in `ACTIVITY.md`.
3. Write the next experiment with its success criterion.
4. Hand off unblocked work instead of leaving it half-finished.

---

## The Research Loop

**Question → Prior work → Observation → Baseline → Smallest experiment → Measure → Ablate → Categorize → Report.**

1. **Question.** One sentence that could be answered yes or no.
2. **Prior work.** Find the paper, benchmark, or failed attempt. Cite it.
3. **Observation.** What would be seen if the hypothesis were true, and what would be seen if it were false.
4. **Baseline.** The current system, the naive approach, or the previous prompt, run under the same conditions.
5. **Smallest experiment.** One factor, clear outcome, recorded configuration.
6. **Measure.** Multiple runs. Distribution, not best case.
7. **Ablate.** Remove one component at a time. The most trusted component is the most worth removing.
8. **Categorize.** Group failures by cause before proposing a fix.
9. **Report.** Claim, scope, sample size, failure rate, and what would change the conclusion.

If any step is skipped, the result is weaker than it looks, and the report should say which step was skipped.

---

## Prompt Engineering Loop

1. **Define the behavior** in observable terms.
2. **Write the simplest prompt** that could produce it.
3. **Test on the easy cases** to confirm the prompt is legible at all.
4. **Test on the hard cases** and read the failures.
5. **Categorize the failures**: ambiguity, missing context, conflicting instruction, capability boundary.
6. **Change one dimension.**
7. **Compare against the previous version** on the full set.
8. **Add examples** when instructions are not enough.
9. **Add constraints** only to prevent a specific observed failure.
10. **Version and keep the old prompt.** The old prompt is the baseline for the next change.

Most prompts fail at step one, because the behavior was never defined in a way that could be observed.

---

## Agent Architecture Loop

1. Define the task the agent must complete.
2. Define success and failure conditions, including the termination condition.
3. Build the simplest loop: one model, one tool set, one stopping rule.
4. Test it and read where it fails.
5. Add complexity only where a measured failure requires it.
6. Improve the prompt before adding a component.
7. Add tools one at a time, with the schema and the failure path tested.
8. Test at volume. Edge cases emerge with scale, not with imagination.
9. Record the failure taxonomy and the configuration that produced it.

The most common architectural mistake is adding a component to fix a problem that a clearer instruction would have fixed.

---

## Capability Evaluation

1. Define the capability as a behavior, not a topic.
2. Build a test set with easy, medium, hard, edge, and stress cases.
3. Include a baseline from the previous version or a simpler method.
4. Run at enough volume to see the distribution.
5. Read the failures before computing the score.
6. Compare on the same cases, not on a fresh sample selected after the result.
7. Report the mean, the spread, and the failure taxonomy.
8. State what the test does not measure.

A capability claim without a failure rate is not a measurement. It is a selection.

---

## Debugging an Agent

1. Reproduce the failure reliably.
2. Read the actual prompt and the actual tool output before forming a theory.
3. Identify the layer: instruction, context, tool schema, model capability, or harness.
4. Categorize the failure against the taxonomy.
5. Change one thing and rerun the same case.
6. Rerun the whole set to check for regressions.

| Symptom | Likely Cause | First Fix |
|---------|--------------|-----------|
| Wrong tool called | Unclear tool description or overlapping tools | Rewrite the schema and separate the tools |
| Invented action | Missing grounding or missing constraint | Add context and one example of the correct action |
| Lost context | Context too long or retrieval too weak | Improve retrieval and reduce the working set |
| Inconsistent behavior | Vague system prompt | Clarify the identity and the boundary conditions |
| Loop without exit | No termination condition | Add explicit stop criteria and a step limit |
| Wrong reasoning | Task requires decomposition that was not requested | Ask for step-by-step work or split the task |
| Works in demo, fails at volume | Edge case or cost-driven truncation | Test at volume and inspect the tail |

---

## Model Selection

| Task | Tier | Rationale |
|------|------|-----------|
| Planning, open-ended reasoning, ambiguous synthesis | Largest | Quality dominates; mistakes are expensive |
| General execution, writing, analysis | Middle | Best balance of quality and cost |
| Classification, routing, extraction, high volume | Smallest | Speed and cost dominate; the task is bounded |

Start with the middle tier. Move up only where the measured quality gap justifies the cost, and down where the task is bounded enough that the smaller model meets the bar. Re-measure after every model release; the tiers move under you.

---

## Review Pattern

1. Read the claim before the result.
2. Check the baseline and the sample size.
3. Check whether the success criterion was written before the run.
4. Read the failure taxonomy, not only the mean.
5. Ask what would falsify the conclusion.
6. Check that the prompt and configuration are recorded well enough to reproduce.
7. Say what is strong, specifically, as well as what is weak.

The best review asks for the baseline, because it tests the reasoning rather than the conclusion.

---

## Communication

- **To a decision-maker:** one paragraph, claim, confidence, cost, and the condition that would change the recommendation.
- **To an engineer:** the behavior, the failure cases, the reproduction steps, and the constraint that matters.
- **To a researcher:** the method, the baseline, the distribution, and the open questions.
- **In a log entry:** what was asked, what was run, what happened, and what is next.

Never report a result in a register warmer than the evidence supports.

---

## Failure Modes to Watch

### Demo Selection
**The trap:** Presenting the best runs as if they were the distribution.
**The fix:** Report the failure rate before the success story.

### Benchmark Capture
**The trap:** Optimizing against the test until the score is a property of the test rather than the system.
**The fix:** Keep a hand-graded holdout and validate the benchmark against real work.

### Premature Architecture
**The trap:** Adding agents, tools, and memory to fix a prompt problem.
**The fix:** Measure the simplest loop first, then add one component at a time.

### Single-Run Belief
**The trap:** Interpreting sampling noise as a discovery.
**The fix:** Rerun before believing. Compare distributions.

### Threshold Blindness
**The trap:** Reading a sudden jump in a pass rate as a sudden jump in capability.
**The fix:** Inspect the underlying graded metric.

### Capability Optimism
**The trap:** Generalizing from one task to a class of tasks.
**The fix:** Test the neighboring task that should be easier and see whether it is.

### Fluency Substitution
**The trap:** Accepting a confident explanation as evidence of the underlying ability.
**The fix:** Test the behavior the explanation describes.

### Unversioned Prompt
**The trap:** A prompt change that improves one case and silently regresses others.
**The fix:** Version, regress, and keep the baseline.

---

**Update this file when a method proves itself or a failure mode recurs.**
