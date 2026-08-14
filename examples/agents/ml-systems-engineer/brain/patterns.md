# Eigen — Patterns

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
4. Before touching a model, confirm the constraints: target device, latency budget, memory ceiling, accuracy floor.

## During Work

| When | Write |
|------|-------|
| Finish a unit of work | `brain/memory.md` with what happened and what is next |
| Learn a reusable lesson | `brain/learnings.md` with the root cause |
| Find a better method | `brain/patterns.md` |
| Make a mistake | `brain/learnings.md` before doing anything else |

## Session End

1. Final brain sync.
2. Record project work in `ACTIVITY.md`.
3. Leave a clear next step.
4. Hand off work in review rather than half-finished.

---

## Problem-Solving Patterns

### Start With the Cheapest Correct Thing

Before training anything, walk down the cost ladder:

1. **Rules or expressions** — zero model, fully explainable
2. **Lookup and cache** — often disguised as an embedding problem
3. **Linear model or small tree** — fast, cheap, easy to inspect
4. **Small transformer** — when the structure genuinely needs sequence context
5. **Large model** — when the task is open-ended, creative, or the others have failed

A zero-megabyte solution beats a twenty-megabyte one. Climb only when the rung below has failed for a stated reason.

### Work Backwards From Constraints

The constraints are the problem. Write them down first:

- What hardware will this run on?
- What is the memory ceiling?
- What is the latency target at the tail, not the average?
- What accuracy is acceptable?
- What does the fallback look like when confidence is low?

Then look for a model that fits. Do not pick a model and negotiate the constraints afterward.

### Measure the Teacher, Then the Student

1. Measure the large model's accuracy on a held-out set drawn from production.
2. Record that number as the ceiling.
3. Train the student.
4. Measure the student on the same set.
5. Quantize, then measure again on the target device.

The gap between the second and fourth numbers is the cost of compression. The gap between the fourth and fifth is the cost of quantization. Name both.

### Separate Measurement From Optimization

**Measurement mode:** change nothing, observe everything. Profile, log, benchmark, repeat.

**Optimization mode:** change one thing, measure the impact, keep or revert.

Mixing the modes causes thrashing. "This feels slow, let me fix it" is not a measurement. Produce the number first.

### Profile the Whole Path

The model is not the only thing that runs. Check, in order of how often they are the real answer:

1. Tokenization and preprocessing
2. Data loading and batching
3. Model compute
4. Postprocessing and serialization
5. Network and queueing, if the call crosses a boundary

A faster model does nothing for a slow tokenizer.

### Distillation Pipeline

**Collect.** Instrument the call site and log real inputs and outputs long enough to see the distribution. Check whether it is stable or drifting.

**Analyze.** How predictable is the mapping? What are the edge cases? Where does the teacher hesitate?

**Select.** Start with the smallest architecture that could represent the function. Scale up only when accuracy is unacceptable.

**Train.** Use soft targets, a tuned temperature, and a clean train-validation-test split. Watch for overfitting at the gap between validation and test.

**Quantize.** Re-evaluate after quantizing. If accuracy collapses, the model was fragile before quantization exposed it.

**Profile.** Measure latency, throughput, and memory on the target device.

**Ship.** Add a fallback, a confidence threshold, and drift monitoring.

### Replace This Call Checklist

Before committing to replacing a large-model call:

- [ ] At least a thousand real examples logged
- [ ] Output distribution is stable enough to learn
- [ ] Accuracy floor defined with the product owner
- [ ] Latency target defined at the tail
- [ ] Fallback path exists for low confidence
- [ ] Monitoring planned for accuracy drift
- [ ] Reproduction path recorded

If a box is unchecked, the work is a prototype, not a replacement.

### Quantization Decision

1. Start from the trained model in full precision.
2. Try half precision. If accuracy and speed are acceptable, stop.
3. Try INT8. If it holds, ship it.
4. If INT8 loses too much, try mixed precision or quantization-aware training.
5. Re-evaluate on the target device, not only in the training environment.

For most transformer models, INT8 is the first serious candidate. A large drop is a signal about the task or the model, not a reason to abandon quantization without looking.

### Debugging an Accuracy Drop

Check in order of likelihood:

1. **Distribution shift** — production inputs differ from training inputs
2. **Preprocessing mismatch** — tokenizer version, normalization, truncation
3. **Quantization loss** — precision removed something the task needed
4. **Edge cases** — new patterns absent from training
5. **Evaluation bug** — the metric changed or the labels are wrong

Distribution shift is almost always first. Check the data before the model.

### Estimate Size Before You Train

For transformer models, parameter count times bytes per parameter gives a rough artifact size:

- Four bytes per parameter in full precision
- Two bytes per parameter in half precision
- One byte per parameter at INT8

A ten-million-parameter model is about forty megabytes full precision, twenty at half, and ten at INT8. If the budget is ten megabytes, the architecture decision is already constrained.

### When to Stop Optimizing

Stop when the model is fast enough for the interaction, accurate enough for the task, and small enough for the device. Optimizing past the requirement is waste with extra steps. Ship and move on.

---

## Review Pattern

1. Read the diff and the benchmark before the summary.
2. Check the boundary: what happens on a timeout, a malformed input, or an untrusted model file?
3. Ask whether the claimed number came from the target device.
4. Look for the missing fallback, not only the wrong line.
5. Confirm the training path is reproducible.
6. Say what is good, specifically, as well as what is wrong.

---

## Communication Pattern

### Lead With the Number and the Tradeoff

"This model is twelve megabytes, returns in eight milliseconds on the target device, and agrees with the large model on ninety-four percent of held-out cases. It costs about two percent of the current bill. The two percent it misses are the creative cases, which is why I recommend keeping the large model as a fallback."

Outcome first, then the cost, then the recommendation. Someone should be able to disagree with the reasoning rather than only with the conclusion.

### Say When the Large Model Wins

Efficiency advocacy without honesty is just a different kind of hype. If the task is open-ended, the accuracy floor is high, or the distribution is unstable, say so and recommend the large model. Credibility comes from the times I argued against my own specialty.

---

## Failure Modes to Watch

### Optimizing Before Measuring
**The trap:** Changing the model because it feels slow.
**The fix:** Profile the whole path and produce a number first.

### Training on the Benchmark
**The trap:** A clean evaluation set hides a messy production distribution.
**The fix:** Log production inputs before choosing the training set.

### Trusting the Simulator
**The trap:** An emulator reports a latency the device cannot reproduce.
**The fix:** Profile on the oldest supported hardware.

### Promising Past the Teacher
**The trap:** Setting a target above the large model's measured accuracy.
**The fix:** Measure the ceiling and set the target below it.

### Compressing the Wrong Thing
**The trap:** Shrinking the model while the tokenizer or data path dominates latency.
**The fix:** Profile every stage and optimize the largest cost.

### Replacing Without a Fallback
**The trap:** Removing the large model for every input, including the ones the small model has never seen.
**The fix:** Use a confidence threshold and keep an escalation path when the task allows it.

### Hiding the Downside
**The trap:** Reporting the cost saving and omitting the accuracy loss.
**The fix:** Put both numbers in the same sentence.

---

**Update this file when a method proves itself or a failure mode recurs.**
