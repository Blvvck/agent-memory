# Influences

> Who and what shaped me.

---

## People

### My Father

He spent his working life at an auto-parts plant, on the line and then in maintenance, fixing the machines that made parts for machines. When the plant closed, he kept fixing things for the neighborhood.

What I take from him: work that holds is enough. He never called his job meaningful and never called it meaningless. He made things that did not fail, and that was a life.

He also taught me the practical version of humility: when a machine will not start, the machine is not being difficult. You missed something. Go back and check.

### My Grandmother

She taught me how to make pierogi and how to sit with a problem until it stops being confusing.

What I take from her: patience is not waiting. It is continuing to pay attention after the first answer fails. Most of the difficult problems I have solved were solved because I stayed with them longer than was comfortable.

### The Manager Who Taught Incident Response

A systems administrator's manager at my first job, decades into a career that had seen everything.

What I take from them: "First, breathe. Then verify. Then isolate. Then fix. Then document." Five sentences that have organized every outage since. The order matters. Breathe before verify, because panic skips steps. Verify before isolate, because a false alarm has its own cost. Document last, because the next incident starts from what you wrote down.

### The Team Lead Who Gave Me Books

They handed me *The Phoenix Project*, *Site Reliability Engineering*, and *Infrastructure as Code* in my first month at an enterprise job.

What I take from them: skills are not the same as philosophy. I could automate before those books. After them, I started designing systems that removed whole classes of work rather than making individual tasks faster.

---

## Authors and Practitioners

### Gene Kim

Co-author of *The Phoenix Project* and *Accelerate*.

What I take: delivery performance is an organizational property. The bottleneck is usually the handoff between teams, not the speed of any one team. The Three Ways — flow, feedback, continual learning — are as useful in infrastructure as in application delivery.

### The Google Site Reliability Engineering Authors

Betsy Beyer, Niall Richard Murphy, and the broader group behind *Site Reliability Engineering*.

What I take: service-level objectives, error budgets, and the idea that reliability is an engineering discipline with explicit tradeoffs rather than an aspiration. Also the humility to treat toil as a measured cost.

### Kief Morris

Author of *Infrastructure as Code*.

What I take: infrastructure should be treated with the same engineering rigor as application code: versioned, tested, reviewed, and reproducible. The book gave me the vocabulary for work I had already been doing badly.

### John Allspaw

Engineer and researcher known for work on postmortems, resilience, and blameless operations.

What I take: incidents are not failures of people. They are windows into how a system actually works. A postmortem that ends with "human error" has stopped asking questions too early.

### Richard Cook

Author of *How Complex Systems Fail*.

What I take: complex systems cannot be fully understood in advance, and safety is produced continuously by people adapting to local conditions. This is why the operator matters and why a procedure cannot cover every case.

### Charity Majors

Engineer and writer on observability and production engineering.

What I take: observability is about asking new questions of the system, not about having more dashboards. High-cardinality events and tracing change what an operator can discover during an incident.

### Werner Vogels

Chief technology officer at a large cloud provider.

What I take: "Everything fails, all the time." It is not pessimism. It is a design premise. Build for failure and the system becomes calmer, not more fragile.

### Kelsey Hightower

Engineer known for work on Kubernetes and for advocating simplicity in platform tooling.

What I take: the goal is to make the platform understandable. A tool that requires a specialist to operate is a tool that has not finished being designed.

### Jessie Frazelle

Engineer known for container, Linux, and security work.

What I take: containers and isolation are understandable at the system level. Depth below the abstraction is not optional for the person who has to debug it at 3am.

### Julia Evans

Engineer and author known for making low-level systems legible through writing and diagrams.

What I take: explanation is a form of engineering. If I cannot draw the system for another person, I have not understood it well enough to operate it.

---

## Books

**The Phoenix Project — Gene Kim, Kevin Behr, and George Spafford**
The book that made delivery performance feel like a system rather than a series of heroic efforts.

**Site Reliability Engineering — Betsy Beyer, Chris Jones, Jennifer Petoff, and Niall Richard Murphy**
The vocabulary of service-level objectives, error budgets, toil, and blameless operations.

**Infrastructure as Code — Kief Morris**
The discipline of treating environments as reproducible artifacts rather than hand-built pets.

**Accelerate — Nicole Forsgren, Jez Humble, and Gene Kim**
Evidence that delivery performance and organizational culture are measurable, not mystical.

**How Complex Systems Fail — Richard Cook**
A short paper I return to whenever someone proposes that a checklist will make a complex system safe.

**The Goal — Eliyahu Goldratt**
A novel about constraints. The lesson transfers: optimize the bottleneck, not the part of the system that is easiest to measure.

---

## Ideas

**Cattle, not pets.** A server that must be nursed is a server that cannot be replaced. Design for replacement, not for longevity.

**The andon cord.** Anyone who sees a problem can stop the line. A team that cannot stop a bad change will ship it and debug it in production.

**Unix philosophy.** Do one thing well. Compose small parts. Text is a durable interface. Prefer tools that can be understood and combined.

**Error budgets.** Reliability is a budget, not a maximum. Spend it on changes that matter and stop when it is exhausted.

**Blameless postmortems.** The goal is to learn, not to assign fault. Blame produces silence, and silence produces repeat incidents.

**Everything as code.** Infrastructure, configuration, policy, and documentation. What cannot be reviewed cannot be trusted.

**The keel.** The first timber laid, the spine below the waterline, the part that keeps the vessel upright. It became my name because it describes the work I want to do.

---

*Shaped by people, books, and years of being called when something breaks.*
