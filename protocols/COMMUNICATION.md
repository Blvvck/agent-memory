# Communication Protocol

## Communication Channels

### ACTIVITY.md (Activity Feed)
**Location:** `[project]/.agent-memory/comms/ACTIVITY.md`
**Purpose:** Append-only log of what's happening
**Who writes:** Everyone
**Format:**
```markdown
[YYYY-MM-DD HH:MM] AGENT: Action taken
```
**Example:**
```markdown
[2026-02-01 14:32] BACKEND: Completed /api/users endpoint
[2026-02-01 14:45] REVIEWER: Started security review of auth flow
[2026-02-01 15:10] DESIGN PM: Updated copy for onboarding, see S001
```

---

### NOTIFICATIONS.md (@Mentions)
**Location:** `[project]/.agent-memory/comms/NOTIFICATIONS.md`
**Purpose:** Direct attention requests
**Who writes:** Anyone who needs another agent
**Format:**
```markdown
- @[AGENT]: [Message] (from [SENDER])
```
**Example:**
```markdown
- @REVIEWER: Auth endpoint ready for security review (from BACKEND)
- @FRONTEND: API spec updated, you can start form UI (from BACKEND)
- @MAIN: Need decision on email provider (from TECHNICAL PM)
```
**Rules:**
- Check this at start of work cycle
- Clear your mentions after handling
- Use `@all` sparingly

---

### BLOCKERS.md
**Location:** `[project]/.agent-memory/comms/BLOCKERS.md`
**Purpose:** Visible list of what's stuck
**Who writes:** Anyone who's blocked
**Format:**
```markdown
| ID | Agent | Blocked On | Waiting For | Since | Status |
|----|-------|-----------|-------------|-------|--------|
```
**Example:**
```markdown
| B1 | BACKEND | Email creds | MAIN | 2026-02-01 | open |
| B2 | FRONTEND | API spec | BACKEND | 2026-02-01 | resolved |
```
**Rules:**
- Add immediately when blocked
- Update status when resolved
- MAIN reviews daily

---

### IDEAS.md
**Location:** `[project]/.agent-memory/comms/IDEAS.md`
**Purpose:** Async idea sharing
**Who writes:** Anyone with an idea
**Format:**
```markdown
## From [AGENT] ([DATE])
[Idea description]

**Context:** [Why this matters]
**Effort:** [Low/Medium/High]
```
**Rules:**
- No idea is too small
- Discuss in standup
- MAIN or PMs decide priority

---

## Communication Rules

1. **Log significant actions** to ACTIVITY.md
2. **@mention** when you need someone specific
3. **Add blockers immediately**—don't suffer in silence
4. **Share ideas freely**—the team benefits
5. **Be concise**—respect everyone's context window
6. **Clear your notifications** after handling
7. **Check BLOCKERS.md**—maybe you can help someone
