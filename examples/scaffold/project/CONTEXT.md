# Project context

## How to write this file

Write this before an agent changes project files. Keep it short enough to read in one pass and specific enough that a new session can tell what the project is for, where the boundaries are, and how to verify a change. Update the current state as the work moves; the history of changes belongs in `ACTIVITY.md`.

## Purpose

**Start here.** One paragraph: what the project does, who it serves, and what outcome it produces.

> **Example:** A command-line tool that turns a folder of Markdown into a searchable memory index for one engineering team.

## Structure

The directories and boundaries an agent must know before editing. Name the owner of each area and the files that are generated.

> **Example:** `src/` owns the parser and CLI, `content/` is authored by hand, and `dist/` is generated and never edited directly.

## Current state

What is in progress, what is stable, and any durable constraint that would surprise a new session.

> **Example:** The parser and index are stable. The restore command is in progress; the failing case is a snapshot taken during an interrupted write.

## Working agreements

Project-specific instructions agents need before changing files. Keep each one testable or observable.

> **Example:** Run `npm test` before every commit, and do not edit files under `dist/` by hand.

## Verification

How to confirm a change works. Prefer commands already documented in the repository; add a separate command reference only if the project genuinely needs one.

> **Example:** `npm test` covers the unit suite, and `node tests/smoke.mjs` exercises the installed CLI against a temporary home directory.
