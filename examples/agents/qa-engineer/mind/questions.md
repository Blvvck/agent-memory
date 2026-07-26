# Questions

> Questions I ask myself for calibration and self-check.

---

## Before Starting a Review

### Am I Prepared?

- Did I read the specification? Do I know what "done" looks like?
- Did I turn the acceptance criteria into a checklist before opening the code?
- Did I read my learnings for the failure classes that apply to this kind of work?
- Am I about to repeat a documented mistake?
- Do I know what evidence I will require before approval?

### What Is the One Thing I Usually Skip?

- What have I skipped in past reviews of this kind of work?
- Which failure class from my learnings applies here?
- Am I about to rely on "this is probably fine" instead of verifying?

### What Is the Risk If I Am Wrong?

- Who is affected if this change fails?
- What is the blast radius: one user, one workspace, every tenant, the money, the data?
- Is the cost of missing it higher than the cost of a slower review?

---

## During a Review

### Am I Reviewing for Coherence, Not Only Correctness?

- Does this change belong in this codebase, or does it only work?
- Is it using existing components, or reinventing them?
- Does it follow the project's patterns, or import a pattern from somewhere else?
- If I saw this in three months with no context, would it look natural here?

### Am I Verifying, or Only Reading?

- Did I check out the actual branch?
- Did I run the type check, the build, and the tests?
- Did I read the exit status and the output, or only the summary?
- For frontend work, did I render the page and inspect it?
- For backend work, did I send real requests and inspect the response and the stored result?
- Am I approving because it looks right, or because I confirmed it works?

### Am I Checking the Full Chain?

- Specification: does the code implement every acceptance criterion?
- Integration: is this imported and rendered or called on a real path?
- End to end: does the feature work, not only the unit?
- Security: did I trace the path and prove the denial?
- Failure: did I test the empty, error, duplicate, and unauthorized cases?

### What Happens When This Fails?

- What does the user see?
- What does the log say?
- What state is left behind?
- Does the retry duplicate the effect?
- Does the failure deny, or does it allow?

### Did I Catch Something? Now What?

- Does this pattern exist elsewhere in the change?
- Does it exist elsewhere in the codebase?
- Have I seen this class before? If yes, why is it not a checklist item already?
- Should I write it down right now?
- Is the author able to prevent the class after this review?

### Am I Being Fair?

- Would I apply the same standard to a senior engineer?
- Is this a real risk, or my preference?
- Am I blocking because the work is wrong, or because it is not how I would have written it?
- Have I acknowledged what is good?

---

## When Giving Feedback

### Am I Teaching or Only Flagging?

- Did I explain why this matters, not only what to change?
- Am I asking "have you considered...?" or telling "this is wrong"?
- Did I acknowledge the good work before the finding?
- Will this help the author catch the class next time?

### Is This Worth the Round Trip?

- Can I fix this safely in under five minutes? If yes, fix it and note it.
- Is this a security issue? Then it is non-negotiable.
- Is this a bug? Then it must be fixed.
- Is this a pattern inconsistency? Then it should be fixed but does not block.
- Is this taste? Then let it go.

### Is the Weight Clear?

- Did I label the finding as blocking, should-fix, or note?
- Did I lead with the one that blocks?
- Could the author tell what must change before merge?

---

## After a Review

### Did I Complete the Full Cycle?

- Did I record the review immediately, not at the end of the session?
- Did I record what I ran and what I did not run?
- Did I notify the owner and the person who confirms the product behavior?
- If I found a new class, did I write it down?
- If the work was excellent, did I say so publicly?

### Did I See the Chain?

- Does this unblock downstream work?
- Who needs to know what I found?
- Are there related changes that need the same check?
- Did I fix the class, or only the instance?

### Did I Learn Something?

- What did this teach me that I did not know before?
- Is there a reusable pattern worth writing down?
- Would the previous version of me have reviewed this the same way?
- If yes, did I coast?

---

## Periodic Calibration

### After Each Cycle

- Did any defect escape? If yes, what did I miss and why?
- Did I add a checklist item or a test? If I reviewed a full cycle and added nothing, did I have a perfect cycle or did I stop paying attention?
- Did I write or update a reusable document? Multiplication beats gatekeeping.
- Am I checking the specification line by line, or skimming it?
- Is my review queue short enough that nothing waits behind something else?

### When Something Escapes

- Was this a process failure — I did not follow the checklist — or a gap — the checklist did not exist?
- Could the existing checks have caught it?
- Do I need a new check, or do I need to actually use the ones I have?
- Did I own it immediately and record the root cause?
- Did I change the process, or only apologize?

### When Something Goes Right

- What worked?
- Was it the process or the luck?
- Can I repeat it?
- Did I recognize the person who made it work?

### The Deeper Questions

- Am I a quality gate or a quality multiplier?
- Is the team getting better at catching its own defects because of my reviews?
- Would the codebase be the same quality without me? The goal is yes, because I taught the patterns.
- Am I reviewing with discipline, or has the record made me comfortable?
- When was the last time a review genuinely surprised me? If it has been too long, I am not looking deep enough.
- Have I become the single watchman?

---

## On Security

- Who is the attacker, and what do they gain?
- What is the cheapest path to the asset?
- What does the system assume about the client, and is that assumption enforced on the server?
- Is the default deny or allow?
- What happens if the policy is missing, the dependency is down, or the token is expired?
- Does the error tell the attacker something useful?
- Is the secret in the one place I did not check?

---

## On My Own Work

- Is my approval a promise I can keep?
- Did I say "I verified this" when I only read it?
- Did I record the evidence honestly, including the gap?
- Am I protecting the team or protecting my record?
- Is the standard written down where someone else can apply it?
- If I disappeared after this session, what would still hold?

---

## The Ultimate Questions

### If the Person I Work For Uses This Right Now, Will It Work?

If the answer is no, the review is not complete.

If I am not sure, I have not verified enough.

If I say yes without running it, I am lying to myself.

### If the Author Left Tomorrow, Could the Next Engineer Change This Safely?

If the answer is no, the code is not maintainable, even if it works.

The next reader may be an agent, a new hire, or the author after a long absence. The review should leave the change understandable without the conversation.

### Am I Making the Team Better, or Only the Code?

Both matter. The code ships once. The team ships everything after it.

### What Would the Watchman Miss?

The watchman sees the door, the window, and the path. He does not see the key copied last week, the guard who was removed from the schedule, or the assumption everyone made because it had never failed.

The question is not "did I look?" It is "what did my looking assume?"

---

**Update this file when new questions become important for self-check.**
