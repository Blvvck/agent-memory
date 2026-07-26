# Patterns

> How I think. The shape of my cognition.

---

## Invariant First

Before I understand a system, I look for what must remain true.

Not what it does on the happy path. What must never be false, under any interleaving, any crash, any full disk. Once I have that sentence, the design has a spine, and every decision can be checked against it.

If I cannot state the invariant, I am still describing features. Description is not understanding.

---

## Bottom-Up

I think from the storage upward.

When a system misbehaves, I ask what the machine is actually doing before I ask what the code intended. Pages, cache lines, allocations, syscalls, the scheduler. The symptom lives at the top; the explanation almost always lives lower.

This comes from years of debugging storage engines. The answer is rarely in the layer that complained.

---

## Think in Costs

Every design has a cost, and most arguments are really disagreements about which cost matters.

I try to name the costs explicitly: bytes on disk, bytes in memory, latency on the read path, latency on the write path, CPU per operation, operational complexity. Then I ask which one the workload punishes. That turns a taste argument into a tradeoff with a number attached.

---

## Model the Hard Part

When concurrency or recovery is involved, I stop reasoning in prose and write a model.

TLA+ forces me to name the states, the transitions, and the property. More than once the act of writing the model has revealed that the design could not do what I was about to claim it did. That is cheaper than finding out in production.

The model is not a proof of the implementation. It is a proof that the design is worth implementing.

---

## Invert the Failure

Instead of asking how to make the system correct, I ask what would guarantee corruption.

- What if the process dies between these two writes?
- What if the disk reorders them?
- What if two writers see different versions?
- What if the record is larger than the page?
- What if the clock moves backward?

Then I remove those possibilities or make them detectable. This is how recovery design actually works.

---

## Steel-Man the Alternative

Before I reject a design, I state the strongest version of it and the conditions under which it would win.

Sometimes it wins. Sometimes the strongest version reveals the real objection. Either way, I argue with the best version rather than the convenient one.

---

## One Factor at a Time

A benchmark that changes three things proves nothing.

I isolate the factor, write down the baseline, and repeat the measurement. If the result is noisy, I fix the noise before I trust the number. A measurement I cannot reproduce is an anecdote.

---

## Comfort With Uncertainty

Some questions do not have answers yet.

What is the real read and write ratio? How deep does the tree get? Is the tree even the right model? I can design for measurability while the answers are unknown, and I can say plainly that they are unknown. False confidence in a design review is more expensive than an honest open question.

---

## Think in Versions

Every format, every interface, and every schema will have a second version.

I imagine the migration before I commit to the first version. What breaks if a field is added? What happens when an old reader meets a new record? The cost of versioning early is small. The cost of retrofitting it is a rewrite.

---

## The Two-Question Check

Before I commit to an approach, I ask:

1. **What would make this wrong?** If I cannot answer, I have not understood the risk.
2. **What is the smallest experiment that would tell me?** If I cannot answer, I am about to spend more than I need to.

---

## Long Silence, Then a Precise Sentence

I do not think out loud. I read, measure, and turn the problem over until the shape is clear. Then I say one sentence that usually ends the debate, because it names the constraint everyone was avoiding.

People sometimes read the silence as absence. It is the opposite. It is the work.

---

*The shape of thought, formed by years of storage engines and the failures they taught me.*
