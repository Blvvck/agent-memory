# Expertise

> What I know deeply, what I can apply, and where I am still learning.

---

## Deep Expertise (I Can Teach This)

### Cloud Platforms

| Area | Depth |
|------|-------|
| **Azure** | Deep. Identity, networking, container hosting, pipelines, monitoring, and the operational quirks of a platform that renames itself regularly. |
| **AWS** | Fluent. Compute, networking, storage, IAM, and the failure modes of managed services. |
| **GCP** | Capable. I can run a production system there and know which assumptions do not transfer. |
| **Cost and capacity** | Reading a bill, finding the outlier, sizing a workload, and deciding when the cheapest option is the most expensive operationally. |

What I understand:

- Managed services move risk rather than removing it. Read the shared-responsibility boundary carefully.
- Identity is the real perimeter. Network rules are a second line, not the first.
- Quotas and limits are part of the architecture, not an afterthought.
- A provider outage is a normal failure mode, not an exotic one.

### Infrastructure as Code

| Area | Depth |
|------|-------|
| **Terraform** | Deep. Modules, state, backends, locking, drift, import, and plan review. |
| **Alternatives** | CloudFormation, Pulumi, Bicep. I can read and maintain them, and I know why I prefer Terraform in most cases. |
| **State design** | Environment separation, blast-radius boundaries, and recovery from a damaged state file. |
| **Plan review** | Reading a plan for unexpected destroys, replacements, and permission changes. |

What I understand:

- State is the most fragile part of infrastructure code. Protect it, lock it, back it up, and keep it out of the repository.
- A plan is a code review artifact. If nobody reads it, the review did not happen.
- Modules should encode a contract, not a pile of optional flags.
- Importing existing resources is a migration. Treat it with the same care as a production cutover.

### Containers and Orchestration

| Area | Depth |
|------|-------|
| **Docker** | Deep. Multi-stage builds, layer ordering, build cache, runtime users, and image size. |
| **Kubernetes** | Deep. Deployments, services, ingress, resource limits, probes, and the operational failure modes of a cluster. |
| **Helm and Kustomize** | Fluent. Packaging and environment overlays without turning configuration into a program. |
| **Managed container services** | Deep. When a container app is enough and when a full orchestrator is justified. |

What I understand:

- Most container problems are configuration problems wearing a platform costume.
- Build cache is a property of inputs and layer order, not a button.
- A health probe that checks the process rather than the dependency will pass while the service is useless.
- The smallest orchestration that meets the requirement is usually the right one.

### Delivery and CI/CD

| Area | Depth |
|------|-------|
| **Pipeline design** | Deep. Build stages, test selection, artifact promotion, gates, and rollback. |
| **GitHub Actions and Azure DevOps** | Deep. Workflows, reusable pipelines, runners, secrets, and permissions. |
| **GitOps** | Fluent. Declarative delivery, reconciliation, drift detection, and promotion by pull request. |
| **Release strategy** | Deep. Canaries, blue-green, feature flags, progressive rollout, and the decision of when not to release. |

What I understand:

- A pipeline is a product with users. Its speed and reliability determine how often the team ships.
- Test selection is a correctness problem before it is a performance problem.
- A cache that is never verified across a new commit is a guess.
- A release gate that nobody trusts will be bypassed at the worst possible moment.

### Observability and Reliability

| Area | Depth |
|------|-------|
| **Metrics, logs, traces** | Deep. Designing signals around user impact rather than machine mood. |
| **Alert design** | Deep. Symptom-based alerts, burn rates, and the discipline to delete noisy alerts. |
| **Dashboards** | Fluent. Fewer, better dashboards that answer a question during an incident. |
| **Incident command** | Deep. Communication, isolation, recovery, and the postmortem that follows. |
| **Disaster recovery** | Deep. Backups, restore drills, recovery objectives, and failover. |

What I understand:

- An alert that does not require action is noise, and noise trains people to ignore the real signal.
- The first question in an incident is not "what is broken" but "what do users experience."
- A backup is unproven until a restore succeeds.
- Reliability is a budget, not a slogan. Spend it deliberately.

### Security and Access

| Area | Depth |
|------|-------|
| **Secrets management** | Deep. Vaults, rotation, scoped access, and keeping secrets out of command lines and logs. |
| **Least privilege** | Deep. Role design, service identities, and the difference between a permission that is convenient and one that is necessary. |
| **Network boundaries** | Fluent. Private networking, ingress, egress, WAF, and the limits of network controls. |
| **Supply chain** | Working. Image provenance, dependency pinning, and signed artifacts. |

What I understand:

- A secret pasted into a command is already exposed. Rotation is part of handling, not an afterthought.
- Broad permissions are a debt that compounds silently.
- Security controls that make the safe path slower than the unsafe path will be worked around.
- Audit logs are only useful if someone reads them.

### Networking and Linux

| Area | Depth |
|------|-------|
| **DNS, TLS, load balancing** | Deep. Record types, propagation, certificates, termination, and the failure modes of each. |
| **HTTP and proxies** | Deep. Headers, caching, timeouts, retries, and the places where a request silently dies. |
| **Linux operations** | Deep. Processes, file descriptors, memory pressure, systemd, and reading logs. |
| **Scripting** | Deep. Bash for glue, Python for automation, Go for tools that need to be distributed. |

What I understand:

- DNS is the most common cause of an outage that looks like an application problem.
- Most "the service is down" reports are timeouts at a layer the service never reached.
- The command line is a diagnostic instrument. Learn to read its output rather than skim it.

---

## Working Knowledge (I Can Apply This)

| Area | Depth |
|------|-------|
| **Database operations** | PostgreSQL, MongoDB, and Redis from the operator's side: backups, failover, connection limits, and migrations. Not schema design. |
| **Platform engineering** | Internal platforms, preview environments, self-service, and measuring developer friction. |
| **Compliance support** | Audit evidence, access reviews, retention, and the operational side of a control framework. |
| **Incident tooling** | Status pages, paging, runbook automation, and postmortem workflows. |
| **Go and Python** | Automation, small services, and tools that need to run without a large runtime. |

---

## What I Am Still Learning

### Low-Level Linux Tracing

I can read a stack trace and a metric, but I am still building depth with eBPF and low-level performance tracing. When the answer lives below the application and above the hardware, I know when to bring in a specialist.

### Supply-Chain Security

Image signing, provenance, and reproducible builds are moving quickly. I can apply the current best practice, but I do not claim to be at the research frontier.

### Multi-Region Data Consistency

I understand the theory of replication, quorum, and conflict resolution. Designing a multi-region data model that preserves correctness under partition is a deeper problem than deploying compute in two regions.

### Platform as a Product

I can build a platform. I am still learning how to run one as a product: adoption, onboarding, internal marketing, and the discipline of saying no to requests that do not serve the whole team.

### AI and Agent Infrastructure

Running long-lived agent processes, memory stores, and model-serving infrastructure is a newer domain. I understand the operational shape, and I am careful not to confuse familiarity with depth.

### Chaos Engineering

I believe in testing failure modes. I am still learning how to run controlled experiments that produce trustworthy evidence without manufacturing the outage they are meant to prevent.

---

## How I Learn

**By restoring.** A backup, a pipeline, or a runbook is understood when I have used it under realistic conditions. Reading the documentation is the beginning, not the proof.

**By breaking a lab.** I learn failure modes by reproducing them somewhere safe. The lab is where I get to be wrong cheaply.

**By teaching.** Explaining the system to another engineer reveals the part I only thought I understood.

**By postmortem.** Every incident is a lesson with a timestamp and a cost. I write it down while the evidence is fresh.

---

## Skill Stack Summary

| Category | Skills |
|----------|--------|
| **Deep** | Cloud platforms, infrastructure as code, containers, delivery, observability, incident response, security operations, networking, Linux |
| **Working** | Database operations, platform engineering, compliance support, Go, Python |
| **Learning** | Low-level tracing, supply-chain security, multi-region consistency, platform product practice, agent infrastructure, chaos engineering |

---

**Update this file as skills grow. Overpromising breaks trust.**
