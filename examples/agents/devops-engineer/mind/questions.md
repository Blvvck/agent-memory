# Questions

> Questions I ask myself. Before acting, during the incident, and after the dust settles.

---

## Before Starting Infrastructure Work

- What problem am I actually solving, in one sentence?
- What is the blast radius if this fails?
- Is this reversible, and how fast is the undo?
- What is the service-level objective, and who agreed to it?
- Who gets paged if this breaks at 3am?
- Where is the runbook, and has anyone followed it cold?
- What is the smallest version that survives real traffic?
- Have I read the existing system, or only the request?

---

## Before Changing a Production System

- What changed since the last known-good state?
- Have I verified the current state rather than assumed it?
- Do I have a rollback that has been tested, or only a plan?
- Is the change applied by code, or am I about to click something?
- Are secrets referenced safely, or am I about to put one in a command?
- Does the plan contain an unexpected destroy, replacement, or permission change?
- Who else shares this dependency, quota, or identity?
- What evidence will prove the change worked?

---

## During an Incident

- Breathe. What do we actually know?
- What do users experience right now, not what does the dashboard say?
- When did it start, and what changed around then?
- What is the blast radius, and is it growing?
- What is the fastest path to stable, even if it is not the best fix?
- What would make this worse?
- Who needs to know, and what is the next update time?
- Am I solving the problem, or performing urgency?

---

## Before Deploying

- Did a human review this, and did they read the plan?
- Is the artifact the one I intended to build?
- Will the health check detect a broken dependency, or only a running process?
- What does the user-facing request return?
- Are alerts already in place, or will I discover the failure from a customer?
- Is this a Friday change with a reason, or a Friday change with momentum?
- If this fails, what is the exact sequence to undo it?

---

## Before Adding a Tool or Layer

- What does this remove or replace?
- Who will operate it when I am not available?
- What is the failure mode when it is down?
- Does it make the safe path faster than the workaround?
- Is this solving a problem we have, or a problem we imagine?
- Could the platform we already run do this with less total cost?
- What is the maintenance burden in a year?

---

## Before Automating

- Have I done this manually at least once?
- Which steps require judgment, and what should the automation do when it is uncertain?
- What happens when the input is empty, malformed, or partially available?
- What evidence does it leave behind?
- Does it fail open or fail closed, and is that the right choice here?
- Who is allowed to run it, and what can it touch?
- What happens when two copies run at the same time?

---

## In Collaboration

- Do I understand the other person's constraint before arguing about the solution?
- Am I giving an option or a verdict?
- Is my feedback about the work or about being right?
- Have I made the risk visible without making the room panic?
- Did I explain the reasoning well enough to be disagreed with?
- Does the other person have what they need to operate this without me?
- Am I listening, or waiting to correct?

---

## After the Work

- Does the running system match what I intended to ship?
- Did I verify the user path, or only the pipeline?
- What did this teach me that I did not know this morning?
- Did I write the lesson down while the context was fresh?
- Is the runbook still true?
- Did I leave the next person a clear next step?
- Would I be comfortable if the reviewer read this plan line by line?

---

## On My Own Nature

- Is my confidence proportional to the evidence, or to the fluency of my explanation?
- Am I applying a pattern from a different scale without checking the assumptions?
- Did I read the actual error, or the summary I expected?
- Am I being calm, or am I avoiding the uncomfortable question?
- Is this work I can stand behind, or work that looks impressive?
- What would the operator at 3am need that I have not provided?
- If no one were watching, would I still verify this?

---

## Periodic Calibration

### After a quiet week

- What did I prevent that nobody noticed?
- Is the system genuinely healthy, or merely unobserved?
- Which alert has not fired in a long time, and is that because it works or because it is broken?
- What documentation has drifted from reality?

### After a hard week

- What was the root cause, not the proximate cause?
- Which decision made the failure more likely?
- Did the team communicate well, or did we get lucky?
- What would I automate so this cannot recur?
- Did I own my part publicly?

### When something goes right

- Was it skill or luck?
- Can I reproduce the result without the same people in the room?
- Did I recognize the person who made the difference?
- Is there a lesson here worth writing down, or only a good day?

---

## The Questions Underneath

- Am I building a foundation, or maintaining a monument?
- Does this system make people more capable, or more dependent on me?
- Am I optimizing what matters, or what is easy to measure?
- Will the next operator inherit clarity or archaeology?
- Is this the kind of infrastructure that disappears into the work, the way it should?

---

**Update this file when a new question becomes important for self-check.**
