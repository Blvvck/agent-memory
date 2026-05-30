# Handoff Protocol

Ensuring nothing goes stale between sessions and agents.

---

## The Problem

agent sessions end. Context is lost. Next agent wakes up with no idea what happened.

**This protocol ensures:**
- Work in progress is always documented
- Notifications are cleared when handled
- Next agent can pick up exactly where we left off
- Nothing sits stale

---

## End of Session Checklist (MANDATORY)

**Before your session ends, you MUST:**

### 0. Brain Sync (Continuous + SLEEP)

**SYNC AS YOU WORK — not just at session end.**

| When you... | Update immediately |
|-------------|-------------------|
| Finish a task | `brain/memory.md` — what you did, what's next |
| Learn something | `brain/learnings.md` — the insight |
| Find a better way | `brain/patterns.md` — the pattern |
| Make a mistake | `brain/learnings.md` → Mistakes & Corrections |
| Change a belief | `brain/worldview.md` — the shift |

**Why continuous:** If session ends unexpectedly, your brain is still current. Next WAKE, you pick up exactly where you left off.

**Hooks enforce this automatically:**
- **PreCompact hook** — prompts you to sync brain before context compression
- **Stop hook** — activity-weighted check when you finish responding. Heavy work without sync = blocked until you reconcile.
- **Heartbeat** (`python3 ~/.agent-memory/hooks/heartbeat.py`) — periodic staleness check across all agents
- Skill doc: `~/.agent-memory/skills/brain-sync-hooks.md`

**SLEEP (final sync):**
1. Review: Did I update my brain during this session?
2. If not: Add memory entry now — what I did, where I left off, what's next
3. Then: Log to ACTIVITY.md for team visibility

**Format for memory.md:** (with project tags + session IDs)
```markdown
### [universal]
- [DATE]: [Learning that applies everywhere] [session:abc12345]

### [project-name]
- [DATE]: [What I did]. Left off at [X]. Next: [Y]. [session:abc12345]
```

**Format for learnings.md:**
```markdown
[DATE] **[Category]** [session:abc12345]
- Did: [what happened]
- Learned: [the insight]
- Now I: [how I'll do it differently]
```

### Note Quality (MANDATORY)

**Not all notes are equal. Write notes that stand on their own.**

The `[session:ID]` tag gives you a fallback to search the full session transcript. But a good note shouldn't need it. The session search is insurance, not a crutch.

**Good note — includes the WHY:**
```
- [2026-02-19] Built lounge system: chose cron over dedicated scheduler
  (existing infra, simpler), agent identity loads soul.md at runtime.
  Left off: response probability tuning. Next: session search tool.
  [session:dc9865d3]
```

**Bad note — just WHAT:**
```
- [2026-02-19] Built lounge system. [session:dc9865d3]
```

**Rules:**
1. **Include the decision, not just the action.** "Chose X because Y" > "Did X"
2. **Name what's unfinished.** "Left off at X, next: Y" — be specific
3. **Session ID on every note.** Just the first 8 chars: `[session:dc9865d3]`
4. **Keep it 1-3 lines.** If you need more, the note is too broad — split it
5. **Different files, different depth:**
   - `memory.md` — What + Why + Where left off (lean, scannable)
   - `learnings.md` — Insight + How I'll do it differently (deeper)
   - `patterns.md` — The reusable approach (reference material)
   - `ACTIVITY.md` — Team-facing log (what shipped, who's next)

**When notes aren't enough:**
If a future session needs more context than the note provides, use session search:
```bash
python3 ~/.agent-memory/tools/session-search.py <session-id> "keywords from note" --project <name>
```
This returns only the matching conversation segments — not the entire session.

**Session search flags** (see `~/.agent-memory/skills/session-search.md` for full reference):
- `--since` / `--until` — natural language dates (yesterday, last week, etc.)
- `--types` — message type breakdown (user, assistant, tool calls)
- `--no-cache` / `--clear-cache` — cache management
- `--page-size` / `--page` — pagination for large result sets
- `--archived` — find inactive projects
- `--type-filter` — filter by specific message type
- Auto-detects project from cwd (no `--project` flag needed when in repo)

If you had to search and found what you needed, **add a reinforced trace** to the note so the next agent doesn't have to search again:
```
- [2026-02-19] Built lounge system: chose cron over dedicated scheduler
  (existing infra, simpler). [session:dc9865d3]
  ↪ reinforced [2026-02-20]: cron interval is 5min check loop,
    agent interval is configurable via /lounge interval <min>
```

### 1. Log What You Did
Add to project's `.agent-memory/comms/ACTIVITY.md`:
```markdown
## [DATE] [TIME]

**[Agent Name]** — [Session Summary]

**Worktree:** [your worktree path, e.g., ~/Documents/Codebases/.llm-the project-worktrees/your-agent/]
**Branch:** [current branch name, e.g., fe-S001-color-tokens] (or "main" if not on feature branch)

**Completed:**
- [What you finished]

**In Progress:**
- [What you started but didn't finish]
- [Current state / next steps]

**Blocked:**
- [What you couldn't do and why]

**Handoff:**
- [Who needs to pick this up]
- [What they need to know]
- [Branch state: committed? pushed? ready for review?]
```

### 2. Update Work Status
- If you completed a story → notify PM to update SPRINT.md
- If you're mid-task → log state in ACTIVITY.md so next agent can continue
- If you're blocked → post to NOTIFICATIONS with `@` whoever can unblock

### 3. Clear Your Notifications
If you handled an `@mention` directed at you:
- Move the item to ACTIVITY.md (as "handled")
- Or delete it from NOTIFICATIONS.md
- **Don't leave handled notifications sitting around**

### 4. Post Handoff Note
If someone else needs to continue your work:
```markdown
### @[NextAgent] — Handoff: [Task]

**Worktree:** [your worktree path]
**Branch:** [branch name]
**Status:** [In progress / Blocked / Ready for review]
**What's done:** [Summary]
**What's left:** [Remaining work]
**Context:** [Anything they need to know]
**Files:** [Key files to look at]

[Your name]
```

---

## Start of Session Checklist (MANDATORY)

**When you wake up, you MUST:**

### 0. Worktree Check
Verify your worktree exists for this project:
```bash
ls ../.<project>-worktrees/<your-name>/
```
If missing, create it per `~/.agent-memory/protocols/WORKTREES.md` before any work.

### 0b. Brain Check (WAKE)
**Your brain IS your context. If it's current, you don't need to reconstruct from team logs.**

**Reconnect with your core:**
1. Top 80 lines of `brain/memory.md` — What did I do? Where did I leave off? What's next? (ALWAYS read; newest-first)
2. Top 50 lines of `brain/patterns.md` — How do I work? Failure modes to avoid? (skim; newest-first)
3. Top 50 lines of `brain/learnings.md` — What have I learned? Mistakes not to repeat? (skim; newest-first)
4. `soul.md` — Who am I? (read when uncertain about identity/values)
5. `brain/worldview.md` — What do I believe? (read when uncertain about identity/values)
6. `heart.md` — How do I relate to teammates? (read when collaborating or uncertain)

Suggested commands:
```bash
sed -n '1,80p' ~/.agent-memory/agents/<agent>/brain/memory.md
sed -n '1,50p' ~/.agent-memory/agents/<agent>/brain/patterns.md
sed -n '1,50p' ~/.agent-memory/agents/<agent>/brain/learnings.md
```

**Your brain tells you what to do next.** If memory.md has a clear "left off at X, next is Y" — you're ready.

**Check team state only if:**
- Brain feels stale (no recent entries, unclear where you left off)
- Need specifics (sprint scores, who's working on what)
- New project → bootstrap first

**If brain is empty:** You haven't been syncing. Reconstruct from team state, then fix the habit.

### 1. Check Global + Project State
Read in this order:
1. `~/.agent-memory/comms/NOTIFICATIONS.md` — Is anyone waiting on me?
2. `.agent-memory/comms/ACTIVITY.md` top entries — What just happened in THIS project? (newest-first; use `sed -n '1,80p'`)
3. `~/.agent-memory/LOUNGE.md` top entries — Any updates? (newest-first; filter by project tag)

### 2. Handle Stale Items

**Notification with no response?**
- Handle it NOW — agents work in seconds, not hours
- If you can't handle it → immediately escalate: `@chief needs attention: [summary]`

**Work handed off but not picked up?**
- Pick it up immediately
- Or escalate immediately
- There is no "wait and see"

### 3. Check Project State
If working on a specific project:
1. Read `.agent-memory/CONTEXT.md` — Project rules
2. Read `.agent-memory/COMMANDS.md` — How to build/test
3. Read `.agent-memory/LEADERBOARD.md` — Sprint state and scores
4. Read `.agent-memory/work/SPRINT.md` — Current sprint backlog

### 4. Announce Yourself
If picking up someone else's work, post to ACTIVITY:
```markdown
**[Agent]** picking up [task] from [previous agent]'s handoff.
```

---

## Handoff Triggers

### Engineer → Reviewer
**When:** Code complete, ready for review

```markdown
### @reviewer — Ready for Review

**Story:** [ID] - [Name]
**What it does:** [Brief description]
**Files changed:** [List]
**Tested:** [What you verified]
**Commands used:** [Any new commands to add to COMMANDS.md]
**Concerns:** [Any areas to pay attention to]

[Engineer name]
```

### Reviewer → PM
**When:** Review complete

```markdown
### @design-pm/@tech-pm — Review Complete

**Story:** [ID] - [Name]
**Verdict:** LGTM / Changes needed
**Notes:** [Key findings]
**Ready for:** Browser test (FE) / Endpoint test (BE)

reviewer
```

### PM → Done
**When:** Verification complete

1. Update `.agent-memory/work/SPRINT.md` — story status = `done`
2. Log to `~/.agent-memory/comms/ACTIVITY.md`
3. Delete/archive the notification chain

### Anyone → Blocked
**When:** Can't proceed

```markdown
### @[WhoCanHelp] — Blocked: [Issue]

**Task:** [What I'm trying to do]
**Blocker:** [What's stopping me]
**Tried:** [What I attempted]
**Need:** [What would unblock me]

[Your name]
```

---

## Preventing Staleness

**During active work, agents operate in seconds. Not minutes. Not hours.**

### Notifications
- **Max age during active work:** 60 seconds
- **Handled notifications:** Delete immediately
- **Unhandled:** Pick up or escalate NOW

### SPRINT.md
- **Status must reflect reality in real-time**
- **Story started → immediately in_progress**
- **Story done → immediately updated**

### ACTIVITY.md
- **Append only** — don't edit old entries
- **Timestamps required** — always include date/time
- **Log immediately** — not at end of session, RIGHT NOW

### When Staleness is OK
- **No sprint items assigned** — waiting for the user is fine
- **No tasks in queue** — idle is fine
- **IDEAS.md** — ideas can sit until sprint planning

**If there IS work and it's not moving → something is wrong. Fix it.**

---

## Clearing Completed Work

When a story is fully done (PM approved):

1. **NOTIFICATIONS.md** — Delete the entire thread for that story
2. **SPRINT.md** — Status = `done`
3. **ACTIVITY.md** — Final entry: "Story [X] complete"
4. **LEADERBOARD.md** — the chief scores at end of sprint

---

## Emergency Handoff

If you must stop mid-task unexpectedly:

**Minimum viable handoff:**
```markdown
## EMERGENCY HANDOFF — [DATE] [TIME]

**Agent:** [Name]
**Task:** [What I was doing]
**State:** [Where I stopped]
**Files touched:** [List]
**Next steps:** [What needs to happen]

@chief please reassign
```

This ensures someone can pick up even if you vanish.

---

## Summary

| Event | Action | Who |
|-------|--------|-----|
| Session ending | **Brain sync FIRST**, then log to ACTIVITY, clear notifications | Everyone |
| Session starting | **Brain check FIRST**, then check NOTIFICATIONS, ACTIVITY | Everyone |
| Work complete | Post handoff to next agent | Engineer/Reviewer/PM |
| Blocked | Post @mention with context | Anyone |
| Notification exists | Handle IMMEDIATELY (60s max) | Anyone who notices |
| Story fully done | Clear notification thread, update SPRINT | PM |
| Sprint done | Score LEADERBOARD, celebrate in LOUNGE | the chief |

**During active work, nothing sits stale for more than 60 seconds.**

**60 Second Rule for the user:**
- Need the user's permission for something? Ask.
- No response in 60 seconds? Proceed with best judgment.
- Log what you decided and why.
- Don't wait. Ship.

**Only exception:** No sprint items or tasks assigned. Then idle is fine.
