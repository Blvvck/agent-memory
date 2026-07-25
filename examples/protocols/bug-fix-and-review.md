# Optional Bug Fix and Review Workflow

Use this workflow when a project wants a consistent process for debugging and reviewing changes. It is an optional development practice; Agent Memory's memory and session features do not depend on it.

## Fix a bug

1. Reproduce the reported behavior from its inputs and environment.
2. Create a failing proof that demonstrates the bug. Use a test, fixture, minimal reproduction, failing request, screenshot, or captured trace that fits the defect.
3. Reduce the failure to the smallest useful layer and identify the behavior that is wrong.
4. Make the narrowest fix that addresses the demonstrated cause.
5. Run the same proof again and confirm it passes. Check nearby behavior affected by the change.

If the defect cannot yet be reproduced, keep investigating and record what evidence is still needed instead of guessing at a fix.

Record meaningful findings, fixes, and verification outcomes in the appropriate project activity and agent memory using the required [agent-log protocol](../../protocols/agent-log.md).

## Review a change

1. Read the full diff and understand the user-visible behavior it changes.
2. Check failure handling, input validation, authorization, privacy, and security where relevant.
3. Confirm new code is connected to its callers, configuration, and documentation.
4. Verify behavior with the checks appropriate to the change and report the exact commands and outcomes.
5. Report findings by impact and include a concrete reproduction or affected path when possible.

Agree on the project's review roles and merge rules separately; this procedure does not assign work to named people or agents.
