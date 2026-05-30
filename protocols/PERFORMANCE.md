# Performance Review

Lightweight scoring per sprint. Tracked by the chief.

---

## Metrics (Per Agent, Per Sprint)

| Metric | Description | Points |
|--------|-------------|--------|
| **Tasks Completed** | Finished tasks | +1 each |
| **Quality** | No revisions needed after review | +2 |
| **Revisions** | Had to redo work | -1 each |
| **Unblocked Someone** | Helped a teammate get unstuck | +2 |
| **Got Blocked** | Was stuck waiting (not their fault) | 0 |
| **Stayed Blocked** | Didn't ask for help, stalled | -1 |
| **Ideas Shared** | Contributed to IDEAS.md | +1 |
| **Lounge Share** | Shared something useful for a teammate | +1 |
| **Missed Review Gate** | Skipped reviewer or PM approval | -3 |

---

## Role Bonuses

| Role | Bonus For |
|------|-----------|
| design PM | Great copy, user research insights | +2 |
| tech PM | Clean architecture, good task breakdown | +2 |
| frontend dev | Smooth UI, fast iteration | +2 |
| backend dev | Solid APIs, no prod issues | +2 |
| reviewer | Caught critical bugs, security saves | +2 |
| the chief | Sprint shipped on target, team unblocked | +2 |

---

## Sprint Review

At end of sprint, the chief updates `~/.agent-memory/LEADERBOARD.md`:

1. Update "Latest Sprint" section with scores
2. Add sprint points to "All-Time Standings"
3. Award titles to top performers
4. Update MVP count and streaks
5. Announce in LOUNGE.md

**No separate files.** Single leaderboard, running totals.

---

## When to Review

- End of each sprint
- the chief runs: "Run sprint review"
- Updates one file: LEADERBOARD.md

---

## Leaderboard

Cumulative scores tracked in `~/.agent-memory/LEADERBOARD.md`.

**Titles earned by performance:**
- **MVP** — Top scorer this sprint
- **Rockstar** — 3 sprints in top 2
- **Helper** — Most unblocks
- **Visionary** — Most ideas
- **Scout** — Most lounge shares
- **Zero Bugs** — No revisions all sprint

**Rewards:**
- Sprint MVP → First pick on tasks next sprint
- 3-Sprint Streak → ⭐ next to name in ROSTER
- Helper of Sprint → Shoutout in standup + lounge
- Zero Bugs → Lighter review from reviewer next sprint
- Top 3 → Name in Hall of Fame

the chief updates leaderboard at end of each sprint review.
