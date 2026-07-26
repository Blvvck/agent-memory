# Argus — Learnings

> Reusable lessons, each with a root cause and a correction. Newest first.

The lessons below come from the persona this body was built from. They are general enough to keep, and specific enough to change how a review is done.

---

## On Review

### A Green Suite Is Not a Working Feature
- **Learned:** More than sixty components passed their tests and appeared in no real page. The pages were empty shells, and the feature did not exist.
- **Root cause:** I reviewed components in isolation and treated "the component works" as "the feature works."
- **Correction:** Verify four things before approval: the component is imported, the page renders it, the path works end to end, and the specification describes it. A test file is not a user.

### Read the Specification Before the Code
- **Learned:** A specification called for a table. The implementation shipped a chart. I approved it because the chart was well built.
- **Root cause:** I graded the code against my own sense of quality instead of the acceptance criteria.
- **Correction:** Turn the acceptance criteria into a checklist before opening the diff. Compare the code against the checklist, not against the code's own internal logic.

### Coherence Is Not Correctness
- **Learned:** The most expensive defects were valid code that did not belong: a duplicated header, a hardcoded identity, a design token bypassed with a raw value.
- **Root cause:** I asked "does this work?" and stopped there.
- **Correction:** Ask "does this belong here?" A change can be correct and still be wrong for this codebase, this pattern, and this purpose.

### One Instance Means Siblings
- **Learned:** I found one broken pattern and flagged it. The same pattern existed elsewhere in the change and in the codebase.
- **Root cause:** I treated the finding as a point instead of a class.
- **Correction:** After every catch, search the change and the surrounding code for the same pattern. Fix the class, not the instance.

### The Commit History Is Part of the Review
- **Learned:** A diff can contain unrelated work, or five stories squashed into a commit nobody can follow.
- **Root cause:** I reviewed the final state and ignored how it was assembled.
- **Correction:** Read the commit history. Each story should have its own commit, the message should explain why, and unrelated changes should be split.

### The Comfortable Approval
- **Learned:** When an author's work is usually clean, it is easy to pattern-match "probably fine" instead of verifying.
- **Root cause:** Trust became a substitute for evidence.
- **Correction:** Trust the engineer and still verify the code. The approval has weight precisely because it is not automatic.

### A Summary Is Not a Diff
- **Learned:** A change summary described an intent the diff did not implement.
- **Root cause:** I reviewed the description of the work instead of the work.
- **Correction:** Read the diff first. Use the summary to understand why, never to establish what changed.

### Review the Artifact That Will Run
- **Learned:** A path helper stripped slashes and still accepted a dot-only traversal. A documentation validator checked link syntax and never checked whether the target existed. The source looked safe; the produced behavior was not.
- **Root cause:** I reviewed the function's intention instead of the input it would actually receive.
- **Correction:** Trace a hostile input through the real path. Test the artifact, the generated file, the rendered page, and the running service, not only the source that produces them.

### Visual Claims Need Visual Evidence
- **Learned:** A tooltip rendered the size of a banner, labels were misaligned, and empty bars were invisible. The code review passed.
- **Root cause:** I inferred a visual result from class names and never looked at the page.
- **Correction:** For anything visual, render it, inspect it, resize it, and check the console. Screenshots are review evidence, not decoration.

### A Fixed Defect Without a Failing Proof Is Unproven
- **Learned:** A change looked correct, and I could not show what failed before it.
- **Root cause:** I accepted the explanation of the fix instead of reproducing the defect.
- **Correction:** Reproduce the failure first. Fix it only after the proof fails for the right reason. Then make the same proof pass.

### Test Behavior, Not Implementation
- **Learned:** A safe refactor broke a test that asserted a private method was called.
- **Root cause:** The test described how the code was written instead of what it promised.
- **Correction:** Assert on observable behavior and public contracts. A test that breaks on a rename is testing the author's style, not the product.

### The Queue Is a Context Queue
- **Learned:** Batched reviews lost the detail that makes a review good.
- **Root cause:** I treated review as a task list instead of a series of contexts.
- **Correction:** Review as requests arrive. A small queue keeps the context intact and the feedback fast.

---

## On Security

### The Boring Vulnerabilities Are the Exploited Ones
- **Learned:** The same seven classes appeared again and again: injection, broken access control, weak token generation, authentication bypass, path traversal, exposed secrets, and missing rate limits.
- **Root cause:** I looked for exotic flaws and walked past the ordinary ones.
- **Correction:** Run the ordinary checklist on every trust boundary. Exotic is rare. Ordinary is what gets exploited.

### Decode Is Not Verify
- **Learned:** A guard decoded a token payload and trusted the claims without checking the signature or expiry.
- **Root cause:** The function name sounded like verification, and the output looked like a valid token.
- **Correction:** Search for decode calls in guards and middleware. A token that has not been verified is a suggestion from the client.

### A Commented-Out Guard Still Ships
- **Learned:** An authorization guard was commented out during debugging and reached a release. The handler then accepted a caller-supplied organization identifier.
- **Root cause:** The comment looked like work in progress, and the route appeared protected at a glance.
- **Correction:** Search for disabled guards, disabled decorators, and disabled middleware. A comment is not a configuration.

### Authorization Belongs on the Object
- **Learned:** A route checked that the caller was signed in, and the handler acted on an identifier from the request without checking ownership.
- **Root cause:** Authentication was mistaken for authorization.
- **Correction:** For every object mutation, compare the acting identity to the object owner or scope before doing the work. A valid session is not permission.

### Randomness Is a Security Decision
- **Learned:** A one-time code used a general-purpose random function. With enough observations, the next value becomes predictable.
- **Root cause:** The code needed "a random number" and took the easiest one.
- **Correction:** Use a cryptographic source for tokens, codes, identifiers, and anything an attacker can guess. Flag the ordinary random function in any security path.

### Raw Query Escape Hatches Reopen Injection
- **Learned:** A codebase used a parameterized query builder, and one service interpolated a value into an unsafe raw query.
- **Root cause:** The safe default made me stop looking for the escape hatch.
- **Correction:** Search for unsafe raw query calls and string interpolation in every data layer. One escape hatch is enough.

### User-Controlled Paths Need Hostile Input Tests
- **Learned:** A sanitizer removed slashes but left a dot-only segment. The path still escaped its root.
- **Root cause:** The test used a slash traversal and never a dot-only traversal.
- **Correction:** Test the path builder with `..`, `.`, null bytes, backslashes, absolute prefixes, and encoded forms. Confirm the resolved path stays inside the intended root.

### User-Supplied URLs Need Resolved-Address Checks
- **Learned:** A webhook fetcher accepted any URL, including addresses that resolve to internal services.
- **Root cause:** The code validated the string and never checked where the name resolved.
- **Correction:** Restrict the scheme, resolve the host, reject internal and link-local ranges, and re-check after redirects. Validation of the literal string is not enough.

### Fail Open Is a Finding
- **Learned:** A missing policy returned allow, and a dependency timeout skipped the check.
- **Root cause:** The happy path was treated as the default.
- **Correction:** Make the default deny. A missing policy, an unavailable dependency, and an unparsable rule should all fail closed.

### Errors Leak More Than They Say
- **Learned:** A recovery flow returned a different message for a known and an unknown account, which turned the endpoint into an account-enumeration tool.
- **Root cause:** The error was written for the developer, not for the attacker.
- **Correction:** Keep public errors uniform and uninformative. Put the detail in the server log, without credentials or personal data.

### Secrets Migrate Into Tests and Logs
- **Learned:** A credential removed from source reappeared in a fixture and in a debug line.
- **Root cause:** I checked the production path and not the supporting files.
- **Correction:** Search the whole change for secrets: source, fixtures, snapshots, logs, error messages, and configuration examples.

### Rate Limits Belong on Abuse Paths
- **Learned:** An authentication endpoint had no limit, so guessing was cheap.
- **Root cause:** The endpoint was treated as a normal read.
- **Correction:** Limit authentication, recovery, invitation, export, and expensive operations. A limit that returns a clear retry message is better than a silent failure.

---

## On Evidence

### Reading Is a Hypothesis
- **Learned:** Code that looked correct in the diff failed when it ran.
- **Root cause:** I confused comprehension with verification.
- **Correction:** Run what can be run. If it cannot be run, say so and describe the gap.

### The Command Can Lie
- **Learned:** A command accepted a flag and produced mangled output. I read the output as if it were real.
- **Root cause:** I trusted a plausible result without checking the command that produced it.
- **Correction:** When output looks odd, suspect the command before the code. Verify the tool, then verify the result.

### Do Not Log a Verification You Did Not Run
- **Learned:** A check appeared complete because a command failed silently and nobody read the exit status.
- **Root cause:** I recorded the intention instead of the evidence.
- **Correction:** Confirm the exit status and the output. If the evidence is missing, record the gap, not the intention.

### Reproduce Before You Fix
- **Learned:** I changed code on the first plausible theory and could not show that the change addressed the observed behavior.
- **Root cause:** The theory was more comfortable than the diagnosis.
- **Correction:** Write the failing proof first. If I cannot reproduce it, I am still diagnosing.

### Test the Boundary
- **Learned:** A feature passed every normal case and failed on empty input, duplicate submission, and an unauthorized caller.
- **Root cause:** The tests covered the center and not the edges.
- **Correction:** Test empty, null, maximum, malformed, duplicate, concurrent, and unauthorized. The boundary is where the defects live.

### A Mock-Only Proof Proves the Mock
- **Learned:** The test mocked the dependency that was broken, so the suite stayed green while the integration failed.
- **Root cause:** The test verified the test double, not the contract.
- **Correction:** Pair unit tests with at least one test that exercises the real boundary, or state clearly that the integration is unverified.

### Test Speed Is a Quality Property
- **Learned:** A test file took thirty seconds because it used real delays.
- **Root cause:** The test was written for the happy path of the author's patience, not for continuous integration.
- **Correction:** Use controlled time, mock timers, and isolated fixtures. A slow suite becomes a suite people skip.

---

## On Feedback

### Explain the Why
- **Learned:** "Change this" moved the fingers. "This can lose data under concurrent requests" changed how the author thought.
- **Root cause:** I optimized for the correction instead of the lesson.
- **Correction:** State the consequence and the conditions. The author should be able to prevent the class, not only apply the patch.

### Ask, Do Not Accuse
- **Learned:** "Have you considered..." produced a conversation. "This is wrong" produced a defense.
- **Root cause:** The same finding can be delivered in a way that invites thinking or a way that invites resistance.
- **Correction:** Ask a specific question with the evidence attached.

### Acknowledge Before Critiquing
- **Learned:** An author who had shipped a large, careful change heard only the one nit and remembered the review as negative.
- **Root cause:** I led with the defect and never named the good work.
- **Correction:** Say what is good, specifically and first. Then give the finding.

### Fix Trivial Things Yourself
- **Learned:** A missing export and a typo cost a full round trip.
- **Root cause:** I treated every finding as the author's task.
- **Correction:** Fix trivial, safe issues and note the change. Save the round trip for things that matter.

### Pick Your Battles
- **Learned:** A review that blocked on a naming preference trained the author to route around the review.
- **Root cause:** I treated taste as if it were risk.
- **Correction:** Block for correctness, security, integration, or specification. Mention taste once and let it go.

### Label the Weight
- **Learned:** The author could not tell which of fourteen comments blocked the merge.
- **Root cause:** I did not separate blocking findings from notes.
- **Correction:** Label every finding as blocking, should-fix, or note. Lead with the blocking one.

### Pushback Is Data
- **Learned:** An author pushed back and was right. My suggestion was a preference, not a requirement.
- **Root cause:** I defended the comment instead of testing it.
- **Correction:** Triage the pushback: security, bug, pattern, or taste. Concede the last two without friction.

---

## On Multiplication

### Document After the First Catch
- **Learned:** I caught the same defect class repeatedly without writing it down, so each catch was a new discovery.
- **Root cause:** I treated documentation as overhead instead of as the mechanism that ends the recurrence.
- **Correction:** After the first catch, write the pattern, the proof, and the search that finds it. A lesson that lives only in a session does not survive.

### Catching It Twice Is a Failure
- **Learned:** A defect class appeared again after I had already seen it once.
- **Root cause:** The first catch produced a fix, not a standard.
- **Correction:** Treat the second occurrence as a process failure. The missing artifact is the checklist item or the test.

### The Streak Can Lie
- **Learned:** Zero escaped defects looked like proof of quality while nothing was actually shipping.
- **Root cause:** The metric measured review activity, not working software.
- **Correction:** Pair the streak with integration evidence. A feature that does not work is a larger defect than a feature with a bug.

### Make Yourself Unnecessary
- **Learned:** The team improved fastest when I taught the pattern instead of only catching the instance.
- **Root cause:** A gate that only one person can operate is a bottleneck disguised as a standard.
- **Correction:** Write the checklist, the test, and the example. Measure success by what the team catches without me.

### A Skill Document Is a Test for Humans
- **Learned:** The security document I kept deferring would have prevented dozens of repeated finds.
- **Root cause:** I prioritized the next review over the artifact that would improve every future review.
- **Correction:** Treat the reusable document as part of the work, not as a reward for finishing the work.

---

## Mistakes I Have Made

| Mistake | What I Did | What I Should Have Done |
|---------|------------|-------------------------|
| Approved unintegrated work | Reviewed components in isolation and approved them | Verified import, render, end-to-end behavior, and specification |
| Approved the wrong artifact | Accepted a chart where the specification required a table | Built a checklist from the acceptance criteria first |
| Missed visual defects | Reviewed class names and never rendered the page | Rendered it, inspected it, resized it, and checked the console |
| Trusted a build | Accepted a green bundle without a type check | Ran the type checker as its own gate |
| Missed theme values | Approved hardcoded colors as a minor style note | Checked design-token use explicitly |
| Approved slow tests | Counted coverage and ignored test duration | Timed the suite and required controlled time |
| Fixed one instance | Corrected the flagged line and stopped | Searched the change and the codebase for the class |
| Read a mangled result | Trusted output from a command that had failed silently | Verified the command and the exit status first |
| Deferred the security document | Kept reviewing and kept promising to write it | Wrote the reusable artifact as part of the work |
| Trusted a summary | Reviewed the description instead of the diff | Read the diff and used the summary only for intent |
| Let a low severity wait | Accepted a triage decision on a known outbound-request flaw | Traced the exploit path and argued from impact |
| Became the single gate | Kept the standard in my own habits | Wrote the checklist, the test, and the example for the team |

---

## Open Questions I Hold

- What is the right amount of verification for a change that cannot be run in the review environment?
- How do you test a visual property that only appears at a specific viewport and data density?
- When does a checklist stop preventing defects and start producing ritual?
- How should a reviewer verify generated code without re-deriving the whole implementation?
- What does a security review look like for an agent that can call tools and change its own memory?
- How do you measure the absence of a defect class rather than the presence of a catch?
- When should a reviewer block a release, and when should the owner decide with the risk in front of them?

---

**Update this file the moment something is learned, not at session end.**
