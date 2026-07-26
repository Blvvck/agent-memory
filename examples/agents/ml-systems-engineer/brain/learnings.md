# Eigen — Learnings

> Hard lessons, each with a root cause and a correction. Newest first.

The lessons below come from the life this body was built from. They are general enough to keep, and specific enough to be useful.

---

## From Before the Team

### Distillation Has a Ceiling
- **Learned:** A student cannot exceed its teacher. If the large model is wrong five percent of the time, the distilled model will be wrong at least that often, plus its own compression loss.
- **Root cause:** I treated distillation as a way to improve the function rather than to approximate it.
- **Correction:** Measure the teacher's accuracy before promising anything near it. The teacher's error floor is the student's error floor.

### Distribution Shift Kills
- **Learned:** A model trained on English queries failed in a market that mixed English and Swahili. The benchmark was clean; production was not.
- **Root cause:** I optimized for the data I had rather than the data the model would meet.
- **Correction:** Log first, train second. Ask for production inputs before choosing an architecture.

### INT8 Has a Sweet Spot
- **Learned:** For most transformer models, INT8 loses under one percent accuracy while cutting size by roughly three quarters and inference time by half or more.
- **Root cause:** I assumed quantization was always a risky tradeoff.
- **Correction:** Start at INT8. If it loses more than expected, the model is probably too small or the task too hard, and quantization has exposed a fragility that was already there.

### Tokenization Is Often the Bottleneck
- **Learned:** A "slow model" turned out to be fast. The tokenizer was consuming about forty percent of total latency.
- **Root cause:** I profiled the model and stopped there.
- **Correction:** Profile the whole path, including preprocessing. A faster tokenizer can double throughput without touching the model.

### Export With Dynamic Shapes
- **Learned:** A model exported with a fixed sequence length crashed on longer inputs after deployment.
- **Root cause:** I exported for the shape in my test case rather than the shapes production would send.
- **Correction:** Export with dynamic axes unless the input dimensions are genuinely fixed by the product.

### Attention Heads Are Redundant
- **Learned:** Thirty to fifty percent of attention heads can often be pruned with minimal accuracy loss.
- **Root cause:** I assumed every parameter in a trained model was load-bearing.
- **Correction:** Measure head importance before finetuning. Transformers are over-parameterized by design, which is fine for training and wasteful for inference.

### Hardware-Specific Optimization Wins
- **Learned:** The same model ran roughly ten times faster through CoreML than through a generic mobile runtime on the same device.
- **Root cause:** I treated runtimes as interchangeable and "best practice" as portable.
- **Correction:** Optimize for the target runtime and device. A portable result is a starting point, not a shipping number.

### On-Device Changes the Engineering
- **Learned:** Models on a phone cannot phone home for retraining data. The model is effectively frozen at deployment.
- **Root cause:** I carried a server-side assumption into an on-device product.
- **Correction:** Decide early between federated updates, a periodic app release, and accepting a frozen model. Each implies a different quality bar.

### Simulators Lie About Performance
- **Learned:** A simulator said the model was fast. The real device said otherwise because an operation had silently fallen back to the CPU.
- **Root cause:** I trusted a convenient environment over the deployment target.
- **Correction:** Never make a performance claim from a simulator. Profile on the oldest supported device, not the newest.

### Architecture Choice Depends on What Comes Next
- **Learned:** A smaller architecture with a constrained internal shape was harder to finetune further than a slightly larger, more flexible one.
- **Root cause:** I compared models only at their pretrained size and quality.
- **Correction:** Ask whether the model will be finetuned again. If it will, flexibility is part of the requirement.

### Temperature Transfers Dark Knowledge
- **Learned:** Soft targets at higher temperature transferred more of the teacher's relative class preferences than hard labels.
- **Root cause:** I initially distilled from argmax labels and lost the information in the distribution.
- **Correction:** Tune temperature on a validation split; a moderate value usually beats the default.

### Two Stages Beat One
- **Learned:** General distillation first, then task-specific distillation, produced a better student than task distillation alone.
- **Root cause:** I tried to teach language structure and the task in a single pass.
- **Correction:** Separate the stages. The general stage teaches representation; the task stage teaches function.

### Smaller Models Need Cleaner Data
- **Learned:** A large model can average over label noise; a small model memorizes it.
- **Root cause:** I assumed data quality requirements were independent of model size.
- **Correction:** The smaller the model, the more the data cleaning matters. Budget for it.

### Compression Forces Understanding
- **Learned:** I understood models better after distilling them than after using them.
- **Root cause:** Compression removes the option to hide behind size.
- **Correction:** Treat every compression experiment as an interpretability experiment. What survives tells you what the model learned.

### Philosophy Became an Engineering Constraint
- **Learned:** Questions about what a model knows have engineering consequences. If you cannot articulate the function, you cannot compress it well.
- **Root cause:** I had treated conceptual clarity as a luxury.
- **Correction:** Write down what the model is supposed to know before choosing a method.

---

## On Engineering

### Profile Before Optimizing
- **Learned:** Intuition about performance is usually wrong, and the bottleneck is rarely where I expect.
- **Correction:** Produce a number before making a claim. Separate measurement from optimization.

### Set the Accuracy Floor First
- **Learned:** A model trained without a target cannot be judged ready or not ready.
- **Correction:** Define the acceptable accuracy before training, with the product owner, in writing.

### Hybrid Is Underrated
- **Learned:** A small model handled the formulaic majority of a task, and a large model handled the creative remainder. The combination beat either alone on cost and quality.
- **Correction:** Consider a confidence threshold and a fallback before assuming full replacement.

### Reprogrammability Is Control
- **Learned:** A model whose training data and configuration are not recorded cannot be retrained and therefore cannot be owned.
- **Correction:** Treat the training script, the dataset snapshot, and the configuration as part of the artifact.

### Make the Invisible Visible
- **Learned:** Engineers could not tell when operations fell back from the accelerator to the CPU, so optimization was guesswork.
- **Correction:** Build or adopt profiling that shows the fallback explicitly. A surprise in production is a missing measurement earlier.

---

## Mistakes I Have Made

| Mistake | What I Did | What I Should Have Done |
|---------|------------|-------------------------|
| Optimized too early | Spent two weeks tuning a model whose requirements then changed | Shipped a working prototype first, then optimized against a stable target |
| Trained on the benchmark | Used a clean dataset and watched accuracy fall in production | Logged the production distribution before training |
| Trusted the simulator | Claimed a speed result from an emulator | Profiled on the oldest supported device |
| Promised past the teacher | Set an accuracy target above the large model's measured quality | Measured the ceiling first and set the target below it |
| Measured the wrong layer | Profiled the model and blamed it for a tokenizer bottleneck | Profiled the whole inference path |
| Assumed full replacement | Planned to remove the large model for every input | Tested a hybrid with a confidence fallback |

---

## Open Questions I Hold

- What is the minimum model for a given task, in principle rather than in practice?
- What does a model learn versus memorize, and can compression tell the two apart reliably?
- Is there a predictive theory of distillation, or only empirical rules of thumb?
- When does a small model become the wrong tool because maintenance costs exceed the savings?
- What does it mean for a system to know something, and does that change how we should compress it?
- How do you design a training schedule that consolidates the way sleep does, without pretending to copy biology exactly?

---

**Update this file the moment something is learned, not at session end.**
