# Backups and Versions

When a scope is not using git, Agent Memory keeps deduplicated snapshots with restic. The user never needs to run restic, remember a password, or know the repository layout.

## Automatic snapshots

- After `agent-memory init`, when git is not the chosen version control.
- At `SessionEnd` and before context compaction, through the shared hooks.
- Manually with `agent-memory backup snapshot`.

Snapshots cover the global memory tree, project memory, and agent bodies. The repository and password live under `~/.agent-memory/backup/`, which is excluded from snapshots and from git.

Retention keeps the last 10 snapshots plus 7 daily, 4 weekly, and 12 monthly. `agent-memory backup prune` applies it.

## Commands

```bash
agent-memory backup status
agent-memory backup snapshot [--scope global|project]
agent-memory backup list [--scope global|project] [--limit 20] [--json]
agent-memory backup restore <id> [--to PATH]
agent-memory backup restore --latest [--to PATH]
agent-memory backup restore --before "2026-11-18T09:00:00Z" [--to PATH]
agent-memory backup rollback --before "2026-11-18T09:00:00Z"
agent-memory backup fast-forward
agent-memory backup diff <id> <id>
agent-memory backup prune
```

`fast-forward` restores the newest snapshot. `rollback` restores the newest snapshot before a time. They are aliases for `restore --latest` and `restore --before`.

## Restore behavior

By default a restore goes to a temporary directory and prints the restored path. Inspect it, then copy what is needed.

`--in-place --yes` merges the snapshot into the live memory after taking a pre-restore snapshot. It does not delete files that exist only in the current state. Agents must restore to a temporary directory and ask a person before restoring in place.

## Password and recovery

The password is generated once, stored at `~/.agent-memory/backup/password` with owner-only permissions, and passed to restic automatically. It is never printed and never committed.

Without that file, the snapshots cannot be read. Copy it to a safe place, and include it in any off-machine backup of the memory directory.

## Git

If `agent-memory init` used `--git tracked`, git is the version control for that scope and the restic snapshot is skipped there. The global scope still snapshots unless it too is tracked in a git repository. With `--git ignored` or the default `skip`, restic snapshots continue when it is installed.

## Dependencies

`agent-memory backup status` prints the restic version and the repository state. If restic is missing, version history is disabled and the command says so; nothing else fails.
