# Tools

Every Agent Memory command in one place. Read the matching protocol for behavior; this file is the command reference.

## Setup and wiring

```bash
agent-memory init
agent-memory init --project --layout standard --harness claude
agent-memory init --global-only --agent <name> --role "One line"
agent-memory init --project --agent <name> --agent-scope project
```

| Option | Meaning |
|--------|---------|
| `--project` | Treat the current directory as a project even without a manifest |
| `--global-only` | Set up global memory and skip project scaffolding |
| `--layout <name>` | `standard`, `claude`, `codex`, `opencode`, `antigravity`, or `cursor` |
| `--harness <names>` | Comma-separated harnesses to wire |
| `--agent <name>` | Create a starter body |
| `--role <text>` | One-line role in the named-agent roster |
| `--agent-scope <scope>` | `global` (default) or `project` |
| `--work` | Add project planning files under `work/` |
| `--team` | Add project lounge and leaderboard |
| `--global-team` | Add shared lounge, tasks, and leaderboard |
| `--git <mode>` | `tracked` stages the scaffolds, `ignored` writes ignore entries, `skip` leaves git alone (default) |
| `--yes` | Use defaults without prompts |

## Memory writes

```bash
agent-log --file <path> --content "what happened" \
  --trace "none (new topic)" \
  --agent <name> --cli claude --session-id <real-id> --project <project>
```

| Option | Meaning |
|--------|---------|
| `--file` | Target protected log |
| `--content` / `--content-file` | Entry body |
| `--trace` | Exact older entry header or `none (new topic)` |
| `--agent`, `--cli`, `--session-id`, `--project` | Identity metadata; all required |

Protected logs: `memory.md`, `learnings.md`, `patterns.md`, `ACTIVITY.md`, `NOTIFICATIONS.md`. Never edit them directly. See `agent-log.md`.

## Trace search

```bash
trace-search <file> <keyword...>
trace-search --multi <file:kw1,kw2> [file:kw3,...]
```

`--json` and `--limit N` change the output. Use it to find the older entry a new entry should link to.

## Current session

```bash
agent-session
agent-session --json
agent-session --field short_session
agent-session --source claude
```

Prints the current session label, or one field from it.

## Heartbeat

```bash
agent-memory-heartbeat
agent-memory-heartbeat --watch
```

Recovers stale sessions and reports memory that still needs syncing. `--watch` keeps scanning.

## Skills

```bash
agent-memory skills
agent-memory skills --global
agent-memory skills --project --quiet
```

Rebuilds `skills/README.md` from the skill files in the selected scope. Global skills live in `~/.agent-memory/skills/`; project skills live in `skills/` inside the project memory directory. Setup also rebuilds the index and the session-start hook refreshes it silently.

## Session history

```bash
agent-memory sessions --list
agent-memory sessions --search "keyword" --harness claude --limit 5
agent-memory sessions --search "release" --project my-project --since 7d
agent-memory sessions --harness codex --json
```

| Option | Meaning |
|--------|---------|
| `--list` | List sessions; the default when no search is given |
| `--search` | Keywords; all must appear in the session |
| `--harness` | `claude`, `codex`, `opencode`, `antigravity`, or `cursor` |
| `--project` | Filter by project or title text |
| `--since` | `3h`, `2d`, `1w`, or a date |
| `--limit` | Maximum results |
| `--context` | Messages before and after each hit |
| `--json` | Machine-readable output |

## Scheduled runs

```bash
agent-memory crons list
agent-memory crons list --all --json
agent-memory crons add --agent <name> --at "2026-11-20T09:00:00Z" \
  --note "What to do" --exec node --arg script.js [--timeout 600]
agent-memory crons add --agent <name> --cron "0 9 * * 1-5" \
  --timezone Europe/London --note "What to do" --runner claude --as-agent
agent-memory crons approve <id>
agent-memory crons pause|resume <id>
agent-memory crons delete <id>
agent-memory crons run <id>
agent-memory crons logs --limit 20
agent-memory crons daemon --interval 30
agent-memory crons daemon --once
```

| Option | Meaning |
|--------|---------|
| `--at` / `--cron` | One-shot ISO time or five-field expression |
| `--timezone` | IANA zone for the expression; defaults to the daemon's zone |
| `--note` | Task passed to the agent or context for a command |
| `--runner` | `claude`, `codex`, `opencode`, `antigravity`, or `cursor` |
| `--exec` + `--arg` | Command argv, no shell |
| `--cwd` | Working directory |
| `--timeout` | Seconds per run |
| `--catch-up` | `once` (default) or `skip` |
| `--as-agent` | Marks the cron agent-created; starts `pending-approval` |

An agent must pass `--as-agent` for any cron it creates. Without it, the cron is treated as human-created and runs immediately. See `crons.md`.

## Diagnostics

```bash
agent-memory doctor
agent-memory doctor --json
```

Reports the platform, Node version, git, restic, sqlite3 or `node:sqlite`, harness CLIs, symlink support, and backup repository state. Use it before reporting a missing feature; a missing optional binary is a dependency issue, not a bug.

## Backups and versions

```bash
agent-memory backup status
agent-memory backup snapshot [--scope global|project]
agent-memory backup list [--scope global|project] [--limit N] [--json]
agent-memory backup restore <id> [--to PATH]
agent-memory backup restore --latest [--to PATH]
agent-memory backup restore --before "2026-11-18T09:00:00Z"
agent-memory backup rollback --before "2026-11-18T09:00:00Z"
agent-memory backup fast-forward
agent-memory backup diff <id> <id>
agent-memory backup prune
```

Snapshots are automatic at setup, session end, and before compaction when restic is available and git is not the chosen version control. The password and repository live under `~/.agent-memory/backup/` and are handled automatically. Restore to a temporary directory first; `--in-place --yes` merges after taking a pre-restore snapshot. See `backup.md`.

## Rules

- Write protected logs only through `agent-log`.
- Use a real session ID. Never invent one.
- Read the matching protocol before using a feature for the first time.
- Session history covers Claude Code, Codex, OpenCode, and Antigravity summaries, and Cursor when its application database exists.
- Cron execution requires the runner CLI to be installed and authenticated.
