# Model Strategy

Use the right model for the job. Save tokens.

The three tiers here — small, standard, and large — are placeholders. Replace them with whatever models your harness offers.

---

## Model Tiers

| Tier | Use For | Cost |
|------|---------|------|
| **Small** | Simple, routine, quick checks | $ |
| **Standard** | Standard work, most tasks | $$ |
| **Large** | Complex, creative, architecture | $$$ |

---

## Task → Model Mapping

### Small (fast & cheap)
- Heartbeat checks
- Status updates
- Reading and summarizing files
- Simple notifications
- Quick lookups

### Standard (default)
- Writing code (features and fixes)
- Code review
- Research tasks
- Most agent work

### Large (complex only)
- Architecture decisions
- Planning
- Complex debugging
- Multi-file refactors
- When the standard model struggles

---

## Agent Defaults

Each agent has a default tier and can escalate to large when a task warrants it. Set the default in the agent's `work.md`; the wake protocol reads it from there.

---

## How to Specify

When invoking an agent, name the tier:

```
"Invoke the backend dev (small) to check the API status"
"Invoke the tech PM (large) to plan the new architecture"
```

Default is standard when nothing is specified.

---

## Rules

1. **Start cheap** — try small first for simple tasks.
2. **Escalate if needed** — switch to standard or large if quality suffers.
3. **Never large for routine** — it's overkill for status checks.
4. **Batch when possible** — one bigger call beats many small ones.
