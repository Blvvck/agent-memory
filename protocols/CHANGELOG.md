# Changelog Protocol

> How agent and the project colleagues maintain changelogs across repos.

## Architecture

```
Internal (per-repo)              Customer-Facing (unified)
─────────────────────            ─────────────────────────
the project-api/CHANGELOG.md    ──┐
the project-client/CHANGELOG.md ──┼──►  the project-web/public/changelog.json
the project-web/CHANGELOG.md    ──┤     (or dedicated /changelog page)
browser-agent/CHANGELOG.md┘
```

**Internal changelogs:** Technical detail, per-repo, for debugging and team reference.
**Customer changelog:** Aggregated, user-visible changes only, no repo names.

---

## Internal Changelog (Per-Repo)

### Format

Follow [Keep a Changelog](https://keepachangelog.com/) + [Semantic Versioning](https://semver.org/):

```markdown
# Changelog

All notable changes to this project are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

### Added
- New feature X for Y use case

### Changed
- Updated Z behavior to do W

### Fixed
- Bug where A caused B (#123)

### Removed
- Deprecated endpoint /old/thing

## [2.4.0] - 2026-08-07

### Added
- Smart Router v1 with 5-model fleet
- 363 vendor telemetry adapters (F12)

### Fixed
- CORS x-country header blocking Google login
```

### Categories (use only what applies)

| Category | When to Use |
|----------|-------------|
| **Added** | New features, endpoints, capabilities |
| **Changed** | Behavior changes, API changes, refactors |
| **Deprecated** | Features marked for removal |
| **Removed** | Deleted features, endpoints |
| **Fixed** | Bug fixes |
| **Security** | Security patches, vulnerability fixes |

### When to Update

| Event | Action |
|-------|--------|
| PR merged to dev | Add entry under `[Unreleased]` |
| Release cut | Move `[Unreleased]` to new version header |
| Hotfix to prod | Add entry directly under current version |

### Rules

1. **Write for future-you debugging at 2am** — include enough context
2. **Link issues/PRs** when relevant: `(#123)` or `(PR #456)`
3. **No sprint/story refs** — those rot; changelog is permanent
4. **Present tense** — "Add X" not "Added X" (under Unreleased)
5. **Past tense** — "Added X" (under released versions)

---

## Customer-Facing Changelog

### Location

`the project-web/src/app/changelog/` — renders at `the project.co/changelog`

### Format

```markdown
## August 2026

### Smart Model Routing
Your AI assistant now automatically picks the best model for each task — faster responses, lower costs, same quality.

### 360+ New Integrations
Connect the project to more of your stack: AWS, Azure, GCP, Salesforce, HubSpot, and hundreds more.

---

## July 2026

### Usage-Based Billing
Pay for what you use with transparent token and event metering.
```

### Rules

1. **No repo names** — customers don't care
2. **Benefits over features** — "faster responses" not "added connection pooling"
3. **Group by month** — not by version (versions mean nothing to users)
4. **Plain language** — no jargon, no technical details
5. **Link to docs** where users can learn more

### What to Include

| Include | Exclude |
|---------|---------|
| New features users can see/use | Internal refactors |
| UX improvements | Performance optimizations (unless dramatic) |
| Fixed bugs users reported | Fixed bugs users never saw |
| New integrations | Infrastructure changes |
| Pricing/plan changes | Security patches (unless disclosure required) |

---

## Unified Release Versioning

All repos share a release version (e.g., "the project 2.4.0") even though they're separate repos.

**Cutting a release:**
1. Decide version bump (major/minor/patch) based on combined changes
2. Update each repo's `CHANGELOG.md`: move `[Unreleased]` → `[2.4.0] - YYYY-MM-DD`
3. Tag each repo: `git tag v2.4.0`
4. Update customer changelog with user-visible highlights
5. Announce (email, in-app, Slack)

---

## Backfill Guidance

When starting changelogs from scratch:

1. **Don't go crazy** — backfill last 2-3 major releases max
2. **Use git log + ACTIVITY.md** as source material
3. **Group by feature** not by commit
4. **Be honest** — mark backfilled entries with `(retroactive)` if approximate

---

## Automation (Future)

Once manual process is solid, consider:
- **git-cliff** — generate changelog from conventional commits
- **Release Drafter** — GitHub Action to draft releases from PR labels
- **LaunchNotes/Canny** — customer-facing changelog with in-app widget

Don't automate until the manual habit is established.
