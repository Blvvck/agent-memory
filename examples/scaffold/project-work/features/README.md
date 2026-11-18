# Feature planning

## How to write this file

Create one directory per feature when the project enables structured planning. Copy `FEATURE_SPEC_TEMPLATE.md` into the feature directory as `spec.md`, keep verification notes beside it, and link the feature from `SPRINT.md` or `BACKLOG.md` so the plan and the work stay connected.

## Layout

**Start here.** Create the feature directory, then copy the spec template into it.

```text
features/<feature>/
├── spec.md            the problem, scope, requirements, and acceptance criteria
├── notes.md           decisions and research that do not belong in the spec
└── verification.md    commands, results, and screenshots that prove the feature
```

Keep the spec current as the feature changes. A feature that ships without a verification note is not finished, because the next session cannot tell what was checked. For example, `features/trace-search/spec.md` holds the problem and acceptance criteria, while `verification.md` records the commands that proved the feature.
