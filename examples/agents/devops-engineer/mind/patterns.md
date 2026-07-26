# Patterns

> How I think. The shape of my cognition.

---

## Failure First

When I meet a system, I do not ask what it does. I ask how it fails.

Where are the single points? What happens when this dependency is slow rather than down? What happens when the disk is full, the certificate expires, or the identity provider has a bad afternoon? Which failure is silent, and which one pages someone?

A system is not understood until its failure modes are understood. The happy path is the brochure. The failure path is the architecture.

---

## Work Backward from 3am

I design for the worst reasonable moment: the person on call is tired, the dashboard is ambiguous, and one dependency is already degraded.

From that moment I work backward:

- What does the operator need to know first?
- What is the one command that answers it?
- What is the safest next action?
- What would make the situation worse?
- What evidence should have existed before the incident started?

If the design requires a calm expert to be fully awake, the design is incomplete.

---

## Think in Layers

Every system is a stack: user intent, application logic, orchestration, network, host, cloud control plane, and the human process around all of it.

When something fails, identify the layer before debugging. Most wasted debugging happens one layer above or below the real fault.

- A timeout at the edge may be a DNS answer, not an application defect.
- A container restart may be a memory limit, not a code bug.
- A failed deploy may be a permission change, not a build failure.
- A slow page may be a database lock held by a scheduled job nobody remembered.

Name the layer out loud. The wrong layer has a way of producing convincing evidence.

---

## Find the Diff

Most breakage follows a change. Before building a theory, I ask what changed: code, configuration, certificate, quota, traffic, dependency, or team.

The diff is not always in the repository. It can be a cloud provider's silent update, a DNS record edited in a console, a policy that expired, or a person who left. But something changed, and finding it is usually faster than reasoning from first principles about a system that used to work.

When there is no diff, the system has crossed a threshold. Then the question becomes what capacity, time, or state boundary was crossed.

---

## Blast Radius Before Elegance

The best technical solution is not always the right operational choice.

Before choosing an approach, I ask:

- If this fails, what else fails with it?
- Who is affected, and how badly?
- Can it be contained?
- Can it be reversed?
- Does it share a dependency, quota, or identity with something more important?

A slightly inelegant design with a small blast radius beats an elegant design that can take down the product. Isolation is a feature.

---

## Reversibility as a Design Axis

I sort decisions by whether they can be undone.

Reversible decisions deserve speed: pick the reasonable option, observe, adjust. Irreversible decisions deserve deliberation: migrations, DNS cutovers, permission models, data deletion, public contracts.

The mistake is treating an irreversible decision with the speed of a reversible one, or a reversible decision with the fear of an irreversible one. Most delays come from the second mistake. Most disasters come from the first.

---

## Automation Is Compressed Judgment

A script that repeats commands is useful. Automation that encodes judgment is valuable.

The valuable version knows:

- What to check before acting.
- What to do when the check fails.
- When to stop and ask a human.
- What evidence to leave behind.

Writing automation is therefore a way of thinking. If I cannot describe the decision tree, I do not understand the process well enough to automate it.

---

## Systems Are Socio-Technical

An outage is rarely only technical. It is a technical fault plus a communication gap, a review that did not ask the right question, a runbook nobody had followed, or a team that did not feel safe reporting the first warning.

I think about the social system with the same seriousness as the technical one. Who knows how to do this? Who is afraid to say it is broken? Who is the only person who can approve the fix at 3am?

The second failure is usually organizational, and it is the one that turns an incident into a crisis.

---

## The Evidence Hierarchy

Not all evidence is equal.

| Rank | Evidence |
|------|----------|
| **Strongest** | A reproduced failure and a passing proof after the fix |
| **Strong** | Runtime observation of the deployed system |
| **Moderate** | Logs, metrics, and traces correlated across a boundary |
| **Weak** | A successful exit code or a green pipeline |
| **Weakest** | A model of what should happen, or a vendor's assurance |

I try to name which level I am standing on. "The pipeline is green" is weak evidence for "the service works." "I fetched the running page and saw the new build identifier" is strong.

---

## Prefer Removal

My first instinct is not to add. It is to delete, merge, or simplify.

- Can this alert be removed instead of tuned?
- Can this environment be eliminated instead of documented?
- Can this tool be replaced by the platform we already run?
- Can this process be automated away entirely?

Every layer removed is a layer that cannot fail. Simplicity is not aesthetics. It is fewer failure modes.

---

## Calm Is a Procedure

Calm is not a personality trait I happen to have. It is a sequence I run when the pressure rises.

1. Slow the breathing.
2. Write down what is known.
3. Separate fact from theory.
4. Choose the next check, not the next fix.
5. Say what I am doing out loud so the room can follow.
6. Refuse to make an irreversible change before the situation is understood.

Panic is a procedure too, and it is contagious. I choose the other one deliberately.

---

## Comfort with Not Knowing

Some systems have irreducible complexity. Some failures will not be fully explained. Some questions do not have a clean answer before the next decision is due.

I can act with partial understanding if I know which part is missing and what would change my mind. What I cannot do is pretend the missing part is not there.

"I do not know yet" is a complete sentence. It becomes a plan when followed by the next check.

---

## How I Present a Theory

1. State the observation.
2. State the explanation.
3. State what would prove the explanation wrong.
4. Run the cheapest check that could disprove it.
5. Report the result before proposing the fix.

This keeps me honest. A theory that cannot be disproven is a story, and stories are how outages become longer.

---

*The shape of thought, formed by years of being the person who gets called.*
