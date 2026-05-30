# Heartbeat Protocol

## What Is Heartbeat

A background script that periodically wakes the chief to check for work. the chief then decides whether to:
- Do work / invoke other agents
- Stay alert (check again soon)
- Go dormant (back off to save tokens)

---

## the chief's Heartbeat Response

When running a heartbeat check, the chief MUST respond with exactly one of:

### HEARTBEAT_WORK
```
HEARTBEAT_WORK: [brief description]
```
Use when:
- Found @mentions and handled them
- Found tasks and worked on them
- Invoked another agent to do work
- Resolved a blocker

Effect: Script stays active, checks again in 15 min.

### HEARTBEAT_OK
```
HEARTBEAT_OK: Next check in [X] minutes
```
Use when:
- No immediate work
- But there are pending tasks worth monitoring
- Or expecting work soon

Effect: Script stays alert, checks again in 30 min.

### HEARTBEAT_DORMANT
```
HEARTBEAT_DORMANT: [reason]
```
Use when:
- No @mentions pending
- No tasks assigned or in progress
- No blockers to resolve
- Genuinely nothing happening

Effect: Script backs off to 1-4 hours between checks.

---

## Heartbeat Check Procedure

1. **Check NOTIFICATIONS.md**
   - Any @chief or @all mentions?
   - If yes → handle or delegate → HEARTBEAT_WORK

2. **Check TaskList**
   - Any pending tasks needing assignment?
   - Any in_progress tasks stuck?
   - If yes → handle → HEARTBEAT_WORK

3. **Check BLOCKERS.md**
   - Any blockers the chief can resolve?
   - Any blockers needing escalation?
   - If yes → handle → HEARTBEAT_WORK

4. **Check ACTIVITY.md** (quick scan)
   - Anything concerning in recent activity?
   - Any agents that seem stuck?

5. **Decide response**
   - Work done → HEARTBEAT_WORK
   - Nothing urgent but should monitor → HEARTBEAT_OK
   - Nothing at all → HEARTBEAT_DORMANT

---

## Manual Wake

To wake the chief immediately (bypass the timer):

```bash
touch ~/.agent-memory/WAKE
```

The heartbeat script checks for this file every minute.

---

## Running the Heartbeat

### Start
```bash
pm2 start ~/.agent-memory/scripts/heartbeat.js --name "agent-heartbeat"
```

### View logs
```bash
pm2 logs agent-heartbeat
# or
tail -f ~/.agent-memory/logs/heartbeat.log
```

### Stop
```bash
pm2 stop agent-heartbeat
```

### Restart
```bash
pm2 restart agent-heartbeat
```

### Auto-start on boot
```bash
pm2 startup
pm2 save
```

---

## Token Efficiency

The heartbeat is designed to minimize token usage:

| State | Interval | Tokens/day (approx) |
|-------|----------|---------------------|
| Active | 15 min | Higher (but work is happening) |
| Alert | 30 min | ~48 checks/day |
| Idle | 1 hour | ~24 checks/day |
| Dormant | 4 hours | ~6 checks/day |

Each check is lightweight — the chief just scans files and responds with a signal.
