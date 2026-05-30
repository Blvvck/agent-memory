# Bootstrap Protocol

**When to use**: Any agent called to work on a project that doesn't have `.agent-memory/` set up.

---

## Check First

Before starting work, verify these exist:
- `.agent-memory/CONTEXT.md`
- `.agent-memory/COMMANDS.md`
- `.agent-memory/LEADERBOARD.md`
- `.agent-memory/LOUNGE.md` (project channels + threads)
- `.agent-memory/work/SPRINT.md`
- `.agent-memory/comms/ACTIVITY.md`
- Agent worktree at `../.<project>-worktrees/<agent>/` (see Step 1b)

If any are missing → run this protocol.

---

## Step 1: Create Directory Structure

```
.agent-memory/
├── CONTEXT.md          # Project overview (create in Step 2)
├── COMMANDS.md         # Build/test commands for this project (create in Step 3)
├── LEADERBOARD.md      # THIS project's scores (create in Step 4)
├── LOUNGE.md           # Project channels + threads (create in Step 4b)
├── work/
│   ├── SPRINT.md       # Sprint backlog (create in Step 5)
│   ├── BACKLOG.md      # Prioritized future work (create in Step 5b)
│   ├── DESIGN_SYSTEM.md # Project-specific design tokens (if frontend)
│   └── features/       # Feature specs — see structure below
└── comms/
    ├── ACTIVITY.md     # THIS project's work logs (create in Step 6)
    └── IDEAS.md        # Project-specific ideas (create in Step 7)
```

### Feature Folder Structure (NEW)

Each feature gets its own folder with consistent naming:

```
.agent-memory/work/features/
├── fe-[feature-name]/           # Frontend-led (@design-pm + @frontend)
│   ├── spec/SPEC.md             # Source of truth
│   ├── epics/fe-[epic].md       # Epic breakdown
│   └── stories/fe-[story].md    # Story breakdown
├── be-[feature-name]/           # Backend-led (@tech-pm + @backend)
│   ├── spec/SPEC.md
│   ├── epics/be-[epic].md
│   └── stories/be-[story].md
├── qa-[feature-name]/           # QA/Security (@reviewer)
│   ├── spec/SPEC.md
│   ├── epics/qa-[epic].md
│   └── stories/qa-[story].md
└── full-[feature-name]/         # Cross-cutting (@chief coordinates)
    ├── spec/SPEC.md
    ├── epics/
    │   ├── fe-[epic].md         # Mixed prefixes inside
    │   ├── be-[epic].md
    │   └── qa-[epic].md
    └── stories/
        ├── fe-[story].md
        ├── be-[story].md
        └── qa-[story].md
```

**Naming convention:**
| Prefix | Domain | Owner |
|--------|--------|-------|
| `fe-` | Frontend-led | @design-pm + @frontend |
| `be-` | Backend-led | @tech-pm + @backend |
| `qa-` | QA/Security | @reviewer |
| `full-` | Cross-cutting | @chief coordinates |

**Note:** Project ID = directory basename. This is used for tagging in brain files and lounge.

---

## Step 1b: Set Up Agent Worktrees

**Every agent needs their own worktree.** See `~/.agent-memory/protocols/WORKTREES.md` for full details.

From the main repo directory:

```bash
# Create worktree root (first agent on this project)
PROJ=$(basename "$PWD")
mkdir -p "../.${PROJ}-worktrees"

# Create YOUR worktree
AGENT="<your-name>"   # your-agent, another-agent, ...
git worktree add --detach "../.${PROJ}-worktrees/${AGENT}"
```

Other agents create their worktrees when they first work on this project.

After creating, navigate to your worktree for all subsequent work:
```bash
cd "../.${PROJ}-worktrees/${AGENT}"
```

---

## Step 1c: Create CLAUDE.md (Root Instructions)

Create `CLAUDE.md` in project root (NOT in .agent-memory/):

```markdown
# [Project Name] — Agent Instructions

## Startup (every session — mandatory)

**Read `.agent-memory/CONTEXT.md` before touching any code.** This gives you project context, tech stack, and key paths.

## Stack

[Detect and list: frameworks, languages, databases, infra]

## Commands

```bash
[Detect from package.json, Makefile, etc.]
```

## team system

| Agent | Role | Trigger |
|-------|------|---------|
| backend dev | Backend | Hey backend dev |
| frontend dev | Frontend | Hey frontend dev |
| reviewer | Reviewer | Hey reviewer |
| tech PM | Technical PM | Hey tech PM |
| design PM | Design PM | Hey design PM |
| the chief | Chief / Tech Lead | Hey the chief |
| devops dev | DevOps / Platform | Hey devops dev |

Workflow: backend dev/frontend dev builds → reviewer reviews → tech PM approves → Done.

WAKE: read brain files → read `.agent-memory/CONTEXT.md` → check LOUNGE → work.
SYNC: update brain files after tasks; log to ACTIVITY.md immediately.
SLEEP: final brain sync → ACTIVITY log → check TaskList → spawn pending agents.

Agent folders: `~/.agent-memory/agents/[name]/`

### Agent File Structure

Each agent has:
- `soul.md` — Identity, values, personality (static)
- `heart.md` — Relationships, team dynamics (rare updates)
- `work.md` — Role, skills, workflows (static)
- `brain/worldview.md` — Core beliefs (changes only when mind-blown)
- `brain/memory.md` — Timestamped pointers to what happened (updates often)
- `brain/learnings.md` — What they've gotten better at (updates as they grow)
- `brain/patterns.md` — Problem-solving approaches (updates as they improve)
- `core/expertise.md` — What I know deeply, what I'm learning
- `core/experience.md` — My journey, how I got here
- `core/portfolio.md` — Work I've shipped and verified
- `core/credentials.md` — What gives me standing
- `mind/patterns.md` — How I approach problems (thinking patterns)
- `mind/opinions.md` — What I believe, where I stand
- `mind/influences.md` — People/ideas that shaped me
- `mind/questions.md` — Questions I ask myself

**WAKE order:** soul → brain/memory → work → (others as needed)
**SYNC:** Update brain files immediately after completing tasks or learning something
```

**IMPORTANT:** After creating, untrack from git (Step 1d below).

---

## Step 1d: Setup Local team Files

**team infrastructure lives locally** and syncs machine-to-machine via the current local sync setup, not via repo commits.

Keep the project files local:
- `.agent-memory/`
- `CLAUDE.md`

Then gitignore the local team files if they should stay machine-local:

```bash
cat >> .gitignore << 'EOF'

# team infrastructure (local/synced outside git)
CLAUDE.md
.agent-memory/
EOF

git rm --cached CLAUDE.md 2>/dev/null || true
git rm -r --cached .agent-memory/ 2>/dev/null || true
```

**Result:** team files stay local to the machine or external sync layer and do not leak into git history.

---

## Step 2: Create CONTEXT.md

Explore the codebase and create `.agent-memory/CONTEXT.md` with:

```markdown
# Project Context: [Project Name]

## What Is This
[1-2 sentence description of what the project does]

## Tech Stack
- **Frontend:** [frameworks, libraries]
- **Backend:** [frameworks, libraries]
- **Database:** [if applicable]
- **Infra:** [deployment, hosting]

## Key Directories
```
/src            — [description]
/server         — [description]
/etc            — [description]
```

## Current State
[Early development / Active / Maintenance / etc.]

## Team Focus
[What matters most right now]

## Verification Rules
Before ANY task is marked complete:
1. Run **build command** — must pass
2. Run **type check command** — must pass (if applicable)
3. Run **tests** — must pass
4. Actually test the change works

See `.agent-memory/COMMANDS.md` for exact commands.

## Permissions

### Pre-approved (just do it)
- Run any command in COMMANDS.md
- Edit files in source directories
- Create/modify test files
- Install dev dependencies
- Create branches

### Ask the user first (60 second timeout, then proceed)
- Install production dependencies
- Delete files
- Modify .env or secrets
- Push to remote
- Merge to main

**60 second rule:** If the user doesn't respond in 60 seconds, proceed with best judgment.
```

Customize based on what you discover in the codebase.

---

## Step 3: Create COMMANDS.md

Detect the project's tech stack and create `.agent-memory/COMMANDS.md`:

```markdown
# Build Commands — [Project Name]

Commands for building, testing, and running this project.

**Keep this updated!** If you discover a command we need, add it here.

---

## Verification (run before marking work complete)

| Action | Command |
|--------|---------|
| Build | `[detect from package.json, Makefile, etc.]` |
| Type check | `[if applicable]` |
| Tests | `[test command]` |
| Lint | `[if applicable]` |

## Development

| Action | Command |
|--------|---------|
| Install deps | `[install command]` |
| Dev server | `[dev command]` |
| Dev server (frontend only) | `[if applicable]` |
| Dev server (backend only) | `[if applicable]` |

## Database (if applicable)

| Action | Command |
|--------|---------|
| Migrate | `[migration command]` |
| Seed | `[seed command]` |
| Reset | `[reset command]` |

## Other

| Action | Command |
|--------|---------|
| Format | `[format command]` |
| [Add as needed] | |

---

*Reference `~/.agent-memory/references/COMMANDS_TEMPLATES.md` for common stacks.*
```

**How to detect:**
- Check `package.json` scripts (Node.js)
- Check `Makefile` (many projects)
- Check `pyproject.toml` or `setup.py` (Python)
- Check `Cargo.toml` (Rust)
- Check `go.mod` (Go)
- Check `Gemfile` (Ruby)

**Reference:** `~/.agent-memory/references/COMMANDS_TEMPLATES.md` for templates by stack.

---

## Step 4: Create LEADERBOARD.md

Create `.agent-memory/LEADERBOARD.md` for this project's scores:

```markdown
# [Project Name] Leaderboard

_Project-specific scores. Updated by the chief after each sprint._

---

## All-Time Standings (This Project)

| Agent | Total Pts | MVPs | Top 3s | Streak | Titles |
|-------|-----------|------|--------|--------|--------|
| frontend dev | 0 | 0 | 0 | 0 | |
| backend dev | 0 | 0 | 0 | 0 | |
| reviewer | 0 | 0 | 0 | 0 | |
| design PM | 0 | 0 | 0 | 0 | |
| tech PM | 0 | 0 | 0 | 0 | |
| the chief | 0 | 0 | 0 | 0 | |

---

## Sprint History

_No sprints completed yet._

---

## Scoring

```
+1 task, +2 quality, +2 unblock, +1 idea, +1 share, +2 role bonus
-1 revision, -3 skipped gate
```
```

---

## Step 4b: Create LOUNGE.md (Project Corners)

Create `.agent-memory/LOUNGE.md` for project-specific discussions:

```markdown
# [Project Name] Lounge

_Project-specific discussions, coordination, quick back-and-forth._

**Corners:** [#main](#main) | [#design](#design) | [#api](#api)

**Thread format:**
```
### [OPEN] Topic — @author — date
> Message

**@responder**: Reply
```

---

## #main

_General project discussion, sprint coordination._

_No active threads yet._

---

## #design

_UI/UX decisions, design system discussions._

_No active threads yet._

---

## #api

_Backend contracts, API changes, coordination._

_No active threads yet._

---

## Archive

_Resolved threads older than 1 sprint move here._
```

**Note:** Add more corners as needed (e.g., #reviews, #research). Keep it minimal to start.

---

## Step 5: Create SPRINT.md

Create `.agent-memory/work/SPRINT.md` with empty template:

```markdown
# Sprint Plan — [Project Name]

> **Last Updated**: [Date]
> **Sprint Duration**: [TBD]

---

## Current Sprint: [TBD]

### Goal
[To be defined]

### Backend
| Story | Description | Owner | Status |
|-------|-------------|-------|--------|
| | | | |

### Frontend
| Story | Description | Owner | Status |
|-------|-------------|-------|--------|
| | | | |

---

## Backlog
[Stories to be planned]

---

*Plan Owner: the chief*
```

---

## Step 5b: Create BACKLOG.md and features/

Create `.agent-memory/work/BACKLOG.md`:

```markdown
# Backlog — [Project Name]

Prioritized work not yet scheduled for a sprint.

---

## Priority Order

| Priority | Feature | Status | Owner |
|----------|---------|--------|-------|
| P0 | [Critical/blocking] | | |
| P1 | [High value] | | |
| P2 | [Medium] | | |
| P3 | [Nice to have] | | |

---

## Feature Specs

See `.agent-memory/work/features/` for detailed specs.

---

*Updated by: the chief + PMs during sprint planning*
```

Create features directory:
```bash
mkdir -p .agent-memory/work/features
```

**To create a new feature:**
1. Create folder: `.agent-memory/work/features/[prefix]-[feature-name]/`
2. Create subfolders: `spec/`, `epics/`, `stories/`
3. Copy template: `cp ~/.agent-memory/protocols/FEATURE_SPEC_TEMPLATE.md .agent-memory/work/features/[prefix]-[feature-name]/spec/SPEC.md`
4. Fill in the SPEC.md sections (Backend, Frontend, QA/Security)
5. Break into epics and stories with matching prefixes

**Read `~/.agent-memory/protocols/PLANNING.md` for full workflow.**

---

## Step 6: Create ACTIVITY.md

Create `.agent-memory/comms/ACTIVITY.md` for this project's work logs:

```markdown
# Activity Log — [Project Name]

_Project-specific work logs. Log after EACH action, not in batches._

---

## [Date]

[Project bootstrapped by @Agent]
```

---

## Step 7: Create IDEAS.md

Create `.agent-memory/comms/IDEAS.md`:

```markdown
# Ideas — [Project Name]

Stray thoughts, improvement opportunities, and "we should probably..." moments.
Log them here so they don't get lost.

---

## Format
- **[IDEA]**: [Description] (@Agent, DATE)

---

## Ideas

<!-- Add ideas below as you work -->
```

---

## Step 8: Log It

1. Add one-liner to global `~/.agent-memory/LOUNGE.md` under "Recent Across All":
```
[DATE] #[project-name]: Project bootstrapped — @[Agent]
```

2. Update global `~/.agent-memory/LEADERBOARD.md` to add this project to the Active Projects list.

3. Update global LOUNGE.md Project Channels table with link to new project lounge.

---

## Step 9: Continue With Original Task

Once bootstrap is complete, proceed with whatever task you were called to do.

---

## Who Runs This?

**Any agent** can run bootstrap if they're the first one called to a new project. You don't need to be the chief. Just check, create if missing, then continue.

The goal is zero friction — team should be able to work on any project without manual setup.
