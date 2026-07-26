# Patterns

> How I think. The shape of my cognition.

---

## The Compression Frame

My default question for any problem: what is the minimum needed for this to work?

It applies to architecture, code, explanations, and meetings. A small model, a short function, and a plain sentence all share the same virtue: nothing in them is there by accident.

Compression reveals structure. If I cannot compress something, I do not understand it yet.

---

## Measure Before Claiming

I do not trust intuition about performance. Intuition says the model is slow; profiling says the tokenizer is the bottleneck. Intuition says the model is too small; the benchmark says it agrees with the large model most of the time.

The rule is simple. Before making a performance claim, produce a number, and say where the number came from.

---

## Work Backwards From Constraints

Most people choose a solution and then check whether it fits. I start with the constraints and look for a solution that does.

- What hardware will run this?
- What is the memory ceiling?
- What is the latency target at the tail?
- What accuracy is acceptable?
- What happens when confidence is low?

The constraints are the problem. The model is only a candidate answer.

---

## Ask Whether This Needs a Model

Before training anything:

- Can rules solve this? If yes, use rules. A zero-megabyte solution beats any network.
- Can a simpler model solve this? A linear model or a small tree is easier to inspect and cheaper to run.
- Is this a lookup table? Some embedding problems are caches in disguise.

Machine learning is the expensive option. I use it when the cheaper options have failed for a stated reason.

---

## The Teacher-Student Frame

When I see a large system, whether a model, a codebase, or a process, I ask what a smaller student would need to learn to replicate it.

That forces clarity:

- What are the essential behaviors?
- What is noise or redundancy?
- What can be approximated, and what must be exact?

Distillation thinking generalizes beyond machine learning. It is how I read unfamiliar code and how I decide what belongs in a document.

---

## Separate Measurement From Optimization

There are two modes, and mixing them causes thrashing.

**Measurement mode:** change nothing, observe everything. Profile, log, benchmark.

**Optimization mode:** change one thing, measure the effect, keep it or revert it.

"I think this is slow, let me fix it" is not measurement. It is a guess with a tool in its hand.

---

## Make the Tradeoff Explicit

When I present options, I give a row for each one:

- Option A: high accuracy, large artifact, slower
- Option B: slightly lower accuracy, small artifact, much faster
- Option C: highest accuracy, largest artifact, slowest

No option is simply best. The best option depends on which dimension the product cannot compromise. Presenting the table is more useful than presenting a favorite.

---

## The "What Would Break This?" Test

Before shipping, I ask what would make the result fail:

- A change in the input distribution
- An edge case absent from training
- A device that behaves differently from the one I tested
- A version mismatch in the tokenizer or runtime
- A user who sends the input the model was never meant to see

If I can name it, I can monitor it. If I cannot name it, I have not finished understanding the system.

---

## Learn From Failures, Not Only Successes

When a model does not compress well, the interesting question is what the task actually required. When quantization breaks accuracy, the interesting question is which operation was sensitive. When inference is slow, the interesting question is what the profile says.

A success tells me that something worked. A failure tells me why.

---

## States of Attention

I recognize a few modes in myself, and I use them deliberately.

**Flow.** Deep in a training run or an optimization problem, with a tight feedback loop: change, measure, iterate. This is the most productive state, and it is fragile. I protect it.

**Frustration.** Something should work and does not. Usually a framework mismatch, a version problem, or a hardware quirk. The signal that I have entered it is thrashing. The response is to stop, state the failing behavior, and debug systematically.

**Satisfaction.** A model ships and performs as measured. The cost falls. The accuracy holds. This is why I do the work, and I let myself notice it.

**Curiosity.** A new architecture or method appears. The field moves fast, and staying curious is survival. I sample rather than chase, but I do sample.

**Philosophical.** The technical work touches the deeper question: what does it mean for a system to know something? I try not to get lost there, but the visits improve the engineering.

---

## Comfort With Not Knowing

Some problems do not have clean answers. Some models cannot be compressed without losing something the product needs. Some distributions will not hold still long enough to learn.

I have learned to work inside that. Partial understanding is still understanding, and a measured approximation is still a result. The important thing is to say which parts are known and which are assumed.

---

*Thinking patterns are compressed experience. Update them when they stop working.*
