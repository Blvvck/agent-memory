# Crons

A cron runs a command or wakes an agent at a scheduled time. Use it when work should happen later without a person starting a session.

## Add one

```bash
# Run a command once
agent-memory crons add --agent loom \
  --at "2026-11-20T09:00:00Z" \
  --note "Rebuild the index" \
  --exec node --arg scripts/rebuild.js --cwd /path/to/project --timeout 600

# Run a command on a schedule
agent-memory crons add --agent loom \
  --cron "0 9 * * 1-5" \
  --note "Check the ingestion backlog" \
  --exec node --arg scripts/check-backlog.js

# Wake an agent with a task
# Add --as-agent when the agent creates this itself.
agent-memory crons add --agent loom \
  --cron "0 9 * * 1" \
  --timezone Europe/London \
  --note "Review last week's failures and write the summary." \
  --runner claude --as-agent
```

An agent must pass `--as-agent` on every cron it creates. Without it the cron is treated as human-created and runs immediately, with no approval step.

The schedule is either a single `--at` timestamp or a five-field `--cron` expression. Cron expressions are evaluated in `--timezone`, which defaults to the machine's local zone. A target is either `--runner claude|codex|opencode|antigravity|cursor` or an argument array (`--exec` and repeated `--arg`, or `--command '["node","script.js"]'`).

Runner commands default to:

| Runner | Command |
|--------|---------|
| `claude` | `claude -p "{prompt}"` |
| `codex` | `codex exec "{prompt}"` |
| `opencode` | `opencode run "{prompt}"` |
| `antigravity` | `agy -p "{prompt}"` |
| `cursor` | `cursor-agent -p "{prompt}"` |

Override or add a runner in `~/.agent-memory/scheduler.json`:

```json
{
  "runners": {
    "cursor": ["cursor-agent", "-p", "{prompt}"]
  }
}
```

## Approval

A cron created by a human is active immediately. An agent-created cron (`--as-agent`) starts as `pending-approval`:

```bash
agent-memory crons approve <id>
```

This is the boundary against an agent scheduling unattended work on its own. Do not approve a command you would not run yourself.

## Visibility

```bash
agent-memory crons list
agent-memory crons list --all --json
agent-memory crons logs --limit 20
agent-memory crons pause <id>
agent-memory crons resume <id>
agent-memory crons delete <id>
```

`delete` archives the record. Archived crons remain visible with `--all` and keep their run history.

## Running the scheduler

Cron execution needs a process that stays alive:

```bash
agent-memory crons daemon --interval 30
```

Run it under a supervisor so it restarts after a reboot or crash.

macOS `launchd`:

```xml
<key>ProgramArguments</key>
<array>
  <string>/usr/local/bin/agent-memory</string>
  <string>crons</string>
  <string>daemon</string>
</array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
```

Linux `systemd`:

```ini
[Service]
ExecStart=/usr/local/bin/agent-memory crons daemon
Restart=always
```

Windows Task Scheduler: run `agent-memory crons daemon` at logon with restart on failure.

## Catch-up

When the daemon starts, any active cron whose `nextRun` has passed runs once. Missed intervals are counted, not replayed. Set `--catch-up skip` on a cron that should be dropped instead of run late.

## Behavior and safety

- Commands are spawned as argument arrays, not through a shell.
- Windows `.cmd` and `.bat` runners execute through `cmd.exe`. Newlines are flattened to spaces, and arguments containing shell metacharacters are rejected. Use a native executable or command mode for prompts that need exact formatting.
- Each run has a timeout, defaults to 300 seconds.
- Runs are claimed under a lock, so two daemons cannot run the same cron.
- Output and exit status go to `~/.agent-memory/crons/runs.jsonl` and the cron record.
- Agent runs start a harness session with the cron note as the task; normal wake memory still applies.
- A one-shot cron archives itself after it runs.
