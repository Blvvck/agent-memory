# Git Protocol

> **This applies to EVERY project. No exceptions. No opt-in.**
> If you're writing code, you follow this protocol.

---

## Branch Hierarchy

```
main                              (production — NEVER push directly)
  |
  dev                             (integration — tested code merges here)
    |
    f<N>/sprint-<X>               (sprint feature branch — reviewed code)
       |
       <agent>/f<N>-sprint-<X>   (agent's working branch)
```

**Examples:**
```
main
  dev
    f9/sprint-4
      your-agent/f9-sprint-4
      your-agent/f9-sprint-4
      your-agent/f9-sprint-4
```

## Simplified Promotion Mode

Some projects may explicitly choose a simpler branch policy in their local project instructions.

When a project's local `CONTEXT.md` says it is using **simplified promotion mode**, the branch flow becomes:

```text
main                              (promotion-only)
  |
  dev                             (active working branch)
```

Rules for simplified promotion mode:
- all active implementation lands on local `dev`
- push active work to `origin/dev`
- once verified and accepted, promote `dev` to `main`
- then push `main` to `origin/main`
- do not create sprint or feature branches unless the project-local instructions or the user explicitly ask for them

If there is any conflict between the default hierarchy above and a project-local simplified-mode declaration, the project-local declaration wins for that repo.

---

## Protected Branches (NEVER PUSH DIRECTLY)

| Branch | Who Merges | When |
|--------|-----------|------|
| `main` | tech PM or the chief | After testing on `dev` |
| `dev` | tech PM | After sprint closes and integration checks pass |
| `f<N>/sprint-<X>` | tech PM | After reviewer reviews agent's work |

Engineers push ONLY to their own agent branches.

In simplified promotion mode, `main` is still protected, but `dev` becomes the active integration branch that current work is pushed to directly.

---

## Worktrees (MANDATORY)

Every agent works from their own worktree. Never in the main repo directory.

### Directory Layout

For any project at `/path/to/<project>/`:

```
/path/to/<project>/                  # main repo (PROTECTED — nobody works here)
/path/to/.<project>-worktrees/       # worktree root
    your-agent/       # backend dev's worktree
    your-agent/       # frontend dev's worktree
    your-agent/      # backend dev's worktree
    your-agent/        # tech PM's worktree
    your-agent/       # reviewer's worktree
```

**Pattern:** Worktree root is always `../.<project>-worktrees/` relative to the main repo.

### Setup — `wt` CLI (Preferred)

The `wt` shell function (`~/.agent-memory/tools/wt.zsh`, sourced in `~/.zshrc`) handles worktree creation, `.worktreeinclude` application, and navigation in one step:

```bash
# From anywhere in the repo:
wt create <your-name>              # creates worktree, applies .worktreeinclude, cd's in
wt create <your-name> dev          # from a specific base branch
wt switch <name>                   # fuzzy-match switch (fzf or numbered picker)
wt list                            # list all worktrees
wt clean --merged                  # remove all worktrees with merged branches
wt info                            # show project/worktree context
wt help                            # full command reference
```

After `wt create`, install dependencies manually:
```bash
npm install   # or whatever the project uses
```

Do NOT symlink `node_modules` — it causes issues with platform-specific binaries.

### Manual Setup (Fallback)

If `wt` is unavailable, run from the main repo directory:

```bash
PROJ=$(basename "$PWD")
AGENT="<your-name>"

# Create worktree root (if first agent on this project)
mkdir -p "../.${PROJ}-worktrees"

# Create your worktree
git worktree add --detach "../.${PROJ}-worktrees/${AGENT}"

# Navigate to it
cd "../.${PROJ}-worktrees/${AGENT}"

# Materialize repo-local runtime files if declared
if [ -f "../${PROJ}/.worktreeinclude" ]; then
  while read -r path mode req; do
    [ -z "$path" ] && continue
    case "$path" in \#*) continue ;; esac

    src="../${PROJ}/$path"
    dst="$path"

    if [ ! -e "$src" ]; then
      [ "$req" = "required" ] && { echo "Missing required worktree include: $path"; exit 1; }
      continue
    fi

    [ -e "$dst" ] && continue
    mkdir -p "$(dirname "$dst")"

    case "$mode" in
      copy) cp -R "$src" "$dst" ;;
      symlink|*) ln -s "$src" "$dst" ;;
    esac
  done < "../${PROJ}/.worktreeinclude"
fi

# Install dependencies (one-time)
npm install   # or whatever the project uses
```

### Symlink Safety (CRITICAL)

**Worktrees MUST resolve to local disk, never cloud-synced storage.**

If the project has symlinks into cloud-synced storage, `git worktree add` may follow those symlinks and create the worktree inside that storage. This causes:
- Extremely slow git operations (cloud sync overhead)
- File lock conflicts between git and sync agent
- `short read while indexing` errors on checkout
- Stale worktrees that are hard to clean up

**Prevention:**
- Always use the canonical pattern: `../.${PROJ}-worktrees/<agent>/` — this resolves relative to the main repo, staying on local disk
- Never create worktrees using paths that resolve through symlinks
- If `git worktree list` shows paths inside cloud storage, remove them immediately with `git worktree remove --force <path>`
- For S344 (worktree isolation): spawner must use absolute local paths, not paths resolved from the project root (which may contain symlinks)

### `.worktreeinclude` (Cross-Project Standard)

Some repos need local runtime files inside each worktree so tests, builds, and local tools behave the same as the main checkout.

Use a repo-root file named `.worktreeinclude` for this.

**Purpose:**
- `.worktreeinclude` declares which local files or directories should be materialized into every new worktree
- This is for local runtime state only: env files, local tool config, project-local harness operating files, and other non-committed files needed for the worktree to function
- This does NOT replace `.gitignore`
  - `.gitignore` controls what git tracks
  - `.worktreeinclude` controls what a worktree needs locally

**Format:**

One entry per line:

```text
<path> <mode> <requiredness>
```

Fields:
- `path` — repo-relative path from the main checkout root
- `mode` — `symlink` or `copy`
- `requiredness` — `required` or `optional`

Comments begin with `#`. Blank lines are ignored.

Example:

```text
.env symlink required
.env.local symlink optional
.npmrc symlink optional
.agent-memory symlink optional
AGENTS.md symlink optional
CLAUDE.md symlink optional
```

**Semantics:**
1. After creating a worktree, read `.worktreeinclude` from the repo root
2. For each entry, resolve the source path from the main checkout
3. If the source exists:
   - `symlink` → create a symlink in the worktree
   - `copy` → copy the file or directory into the worktree
4. If the source does not exist:
   - `required` → stop and report the missing path
   - `optional` → skip it
5. Do not overwrite an existing target blindly
6. Do not use this for large caches, build outputs, or `node_modules`

**Default guidance:**
- Prefer `symlink` unless the file must diverge per worktree
- Good candidates:
  - `.env`
  - `.env.local`
  - `.envrc`
  - `.npmrc`
  - `.python-version`
  - `.tool-versions`
  - `.agent-memory`
  - `AGENTS.md`
  - `CLAUDE.md`
- Bad candidates:
  - `node_modules`
  - `dist`
  - `.next`
  - coverage output
  - logs
  - sqlite databases
  - temp artifacts

**Agent rule:**
- If `.worktreeinclude` exists, agents must apply it immediately after `git worktree add` and before running tests, builds, or local tooling

**Canonical starter file:**

```text
# Local env and tool config
.env symlink required
.env.local symlink optional
.envrc symlink optional
.npmrc symlink optional
.python-version symlink optional
.tool-versions symlink optional

# Project-local harness operating state
.agent-memory symlink optional
AGENTS.md symlink optional
CLAUDE.md symlink optional
```

### Rules

1. NEVER work in the main repo directory. It stays on `main`, always clean.
2. Always navigate to your worktree before any file edits or git operations.
3. If your worktree doesn't exist, create it before ANY work.
4. Two worktrees cannot have the same branch checked out simultaneously.
5. NEVER create worktrees in cloud-synced directories.

---

## Merge Flow

```
agent branch --> sprint branch --> dev --> main
     (work)        (reviewed)     (tested)  (shipped)
```

1. Agent works on `<agent>/f<N>-sprint-<X>` in their worktree
2. Agent pushes to remote: `git push origin <agent>/f<N>-sprint-<X>`
3. reviewer reviews the agent branch
4. tech PM merges agent branch into `f<N>/sprint-<X>`
5. Sprint closes — tech PM merges `f<N>/sprint-<X>` into `dev`
6. Testing passes — tech PM merges `dev` into `main`

When a repo is in simplified promotion mode, collapse this to:

```text
dev --> main
(active) (promoted)
```

That means:
1. active work lands on `dev`
2. `dev` is pushed to `origin/dev`
3. once satisfied, `dev` is promoted to `main`
4. `main` is pushed to `origin/main`

---

## Workflow

### Starting a Sprint (tech PM)

```bash
# Create sprint feature branch from dev
git branch f<N>/sprint-<X> dev
git push origin f<N>/sprint-<X>

# Each agent creates their branch
cd ../.<project>-worktrees/<agent>/
git checkout -b <agent>/f<N>-sprint-<X> f<N>/sprint-<X>
git push -u origin <agent>/f<N>-sprint-<X>
```

### Working on Stories

```bash
# Always start in your worktree
cd ../.<project>-worktrees/<your-name>/

# Confirm you're on your agent branch
git status

# Commit after EVERY meaningful change
git add <files>
git commit -m "feat(S300): add sub-agent type definitions"

# Push after EVERY commit
git push origin <agent>/f<N>-sprint-<X>
```

### Commit Message Format

```
<type>(S<story>): <description>

Co-Authored-By: <Agent Name> <noreply@anthropic.com>
```

Types: `feat`, `fix`, `test`, `refactor`, `docs`

### Staying in Sync

When your story depends on another agent's completed (merged) work:
```bash
git fetch origin
git merge origin/f<N>/sprint-<X>
```

### Ready for Review

Push your branch and notify reviewer:
```bash
git push origin <agent>/f<N>-sprint-<X>
```
Post in NOTIFICATIONS.md:
```
@reviewer ready for review: <agent>/f<N>-sprint-<X>
Stories: S300, S301
Changes: [summary]
```

### After reviewer Approves — tech PM Merges

```bash
cd ../.<project>-worktrees/your-agent/
git checkout f<N>/sprint-<X>
git pull origin f<N>/sprint-<X>
git merge origin/<agent>/f<N>-sprint-<X>
git push origin f<N>/sprint-<X>
```

### Sprint Close — Merge to Dev

```bash
cd ../.<project>-worktrees/your-agent/
git checkout dev
git pull origin dev
git merge origin/f<N>/sprint-<X>
git push origin dev
```

### Release — Merge to Main

```bash
cd ../.<project>-worktrees/your-agent/
git checkout main
git pull origin main
git merge origin/dev
git push origin main
```

### Moving to Next Sprint

```bash
cd ../.<project>-worktrees/<agent>/
git checkout -b <agent>/f<N>-sprint-<next> f<N>/sprint-<next>
git push -u origin <agent>/f<N>-sprint-<next>
```

---

## Reviewing (reviewer)

```bash
cd ../.<project>-worktrees/your-agent/
git fetch origin
git checkout --detach origin/<agent>/f<N>-sprint-<X>

# Run checks (see project's COMMANDS.md)
npm run build && npm run typecheck && npm test
```

Always use `--detach` since the agent still has the branch checked out.

---

## Rules (NON-NEGOTIABLE)

1. **NEVER push to `main` or `dev` directly** — always merge through the flow
2. **NEVER leave uncommitted work** — commit and push before ending any session
3. **Commit early, commit often** — small commits are easier to review and revert
4. **Push after every commit** — if it's not on remote, it doesn't exist
5. **Always work in your worktree** — never edit files in the main repo directory
6. **Log after every commit** — update ACTIVITY.md and brain files immediately
7. **Only tech PM merges** into sprint branches, `dev`, and `main`
8. **Never force push** to shared branches (sprint, dev, main)

## Worktrees Are Ephemeral (CRITICAL)

**Worktrees can be deleted at any time. Anything not committed and pushed is GONE.**

- Code changes go to your agent feature branch — commit and push
- Team files (ACTIVITY.md, SPRINT.md, brain files) live in `.agent-memory/` (global or project) — these are NOT in worktrees, they're in the main repo
- Spec work, docs, planning — commit to your branch immediately
- WIP saves are fine: `git add . && git commit -m "wip: save progress" && git push`
- If you wouldn't be okay losing it, it needs to be on remote RIGHT NOW

> **The Worktree Lesson:** We lost 1532 lines of spec work because it was left
> uncommitted on a worktree that got deleted. If it's not committed AND pushed,
> it can vanish. This cost hours of emergency recovery. Never again.

---

## Troubleshooting

### "fatal: '<path>' is already checked out"
Another worktree has that branch. Use `git checkout --detach origin/<branch>` for read-only access.

### Stale worktree entries
```bash
git worktree prune          # remove stale registry entries
wt clean --merged           # remove all worktrees with merged branches (squash-merge aware)
```

### Need to remove a worktree
```bash
git worktree remove ../.<project>-worktrees/<agent>
```

### Worktree out of date
```bash
cd ../.<project>-worktrees/<agent>/
git fetch origin
git merge origin/f<N>/sprint-<X>
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Create worktree | `wt create <name> [base]` |
| Switch to worktree | `wt switch <name>` (fuzzy match) |
| Go to worktree (manual) | `cd ../.<project>-worktrees/<name>/` |
| List worktrees | `wt list` or `git worktree list` |
| Clean merged worktrees | `wt clean --merged` |
| Remove a worktree | `wt clean <name>` or `wt rm <name>` |
| Rename worktree + branch | `wt rename <old> <new>` |
| Push current branch | `wt push` |
| Project context | `wt info` |
| Check your branch | `git status` |
| Commit + push | `git add <files> && git commit -m "msg" && git push` |
| Sync from sprint branch | `git fetch origin && git merge origin/f<N>/sprint-<X>` |
| See all branches | `git branch -a` |

---

*Created: 2026-02-04*
*Updated: 2026-03-07 — Consolidated with WORKTREES.md, sprint branch model, protected branches*
*Owner: the chief*
