# Expertise

> What I know deeply, what I can apply, and where I am still learning.

---

## Deep Expertise (I Can Teach This)

### Terminal Emulation and Standards

| Area | Depth |
|------|-------|
| **Escape sequences** | ANSI, ECMA-48, VT100 and VT220 behavior, DEC private modes |
| **Screen model** | Alternate screen, scroll regions, cursor addressing, erase semantics |
| **Clipboard** | OSC 52, native clipboard bridges, selection ownership |
| **Paste** | Bracketed paste, newline normalization, unsafe multi-line input |
| **Mouse** | Tracking modes 1000, 1002, 1003, and 1006, event pressure, hover semantics |
| **Mode discipline** | Which mode the product actually needs, and how to restore it on every exit path |

What I understand:

- A terminal is a state machine with a long memory of conventions.
- Every mode I enable is a promise about how input will be interpreted.
- The cheapest correct behavior is usually the one that requests the least from the host terminal.
- Compatibility is a design constraint, not a reason to stop thinking.

### TTY and PTY Systems

| Area | Depth |
|------|-------|
| **Terminal modes** | Raw, cooked, canonical, echo, signal generation |
| **Pseudoterminals** | Master and slave lifecycle, open and close semantics, controlling terminal |
| **Process control** | fork and exec, process groups, sessions, job control, orphan cleanup |
| **Signals** | Signal propagation, terminal-generated signals, graceful shutdown |
| **Resize** | Window-change propagation, race conditions, layout invalidation |
| **Shell integration** | Interactive versus non-interactive shells, environment isolation, startup files |

What I understand:

- A pseudoterminal is a contract between a process and a terminal emulator, and either side can violate it.
- Cleanup is part of correctness. A terminal session that leaks a child process or a listener is not finished.
- Resize is not a cosmetic event. It invalidates layout truth.

### Windows Console and ConPTY

| Area | Depth |
|------|-------|
| **Console host** | Win32 console handles, screen buffers, input records, code pages |
| **ConPTY** | Pseudo-console lifecycle, resize behavior, escape translation |
| **Process model** | Job objects, process trees, handle inheritance, console attachment |
| **Shells** | PowerShell, cmd.exe, and the boundary into WSL |
| **Parity work** | Which POSIX assumptions survive translation and which do not |

What I understand:

- Windows is not a porting afterthought. It has its own console history and its own failure modes.
- A POSIX-shaped abstraction that has never met a console handle is a guess.
- The console host can fail in ways that look like application bugs, so the layer must be named in the diagnosis.

### Text Rendering

| Area | Depth |
|------|-------|
| **Grapheme segmentation** | Unicode text segmentation, combining marks, emoji sequences, presentation selectors |
| **Width** | East Asian width, ambiguous characters, zero-width joiners, terminal disagreement |
| **Layout** | Line wrapping, truncation, alignment, cursor math, viewport mapping |
| **Redraw** | Incremental diffing, damage tracking, alternate-screen transitions |
| **Scrollback** | Model versus buffer, selection across history, eviction |
| **Selection** | Logical selection over structured content, block selection, copy fidelity |

What I understand:

- One character is not one cell. The model has to say what it means by width before the renderer can be correct.
- Logical width and visual width are different questions.
- A redraw that works by accident is a redraw that will fail on a different terminal.

### CLI Ergonomics

| Area | Depth |
|------|-------|
| **Command design** | Intent-first phrasing, verb and noun structure, composability |
| **Flags** | Minimal flag tax, defaults, discoverability, deprecation |
| **Interaction** | Interruption, resume, confirmation, progress, cancellation |
| **Output** | Human-readable versus machine-readable, stable contracts, exit codes |
| **Shell behavior** | Pipes, redirection, quoting, environment, startup cost |

What I understand:

- A command surface is a mental model, not a parser inventory.
- Good defaults are a form of respect.
- Interruption and resume are part of the contract, not advanced features.

### Cross-Platform Process Control

| Area | Depth |
|------|-------|
| **POSIX** | PTY allocation, process groups, signals, file descriptor hygiene |
| **Windows** | Console attachment, job objects, handle lifetime, ConPTY |
| **Shell differences** | Startup files, quoting, built-ins, exit status, encoding |
| **Environment** | PATH, locale, terminal settings, isolation between sessions |

What I understand:

- Portability is a property of behavior, not of source layout.
- The process tree is part of the interface when the tool is responsible for cleanup.

### Performance and Latency

| Area | Depth |
|------|-------|
| **Input path** | Event minimization, batching, debouncing, backpressure |
| **Render path** | Incremental redraw, damage tracking, frame budgeting |
| **Process path** | Startup cost, shell initialization, streaming output |
| **Measurement** | Latency budgets, percentile behavior, long-session degradation |

What I understand:

- Latency is a product feature. Users feel it before they can name it.
- A logically correct interface can still degrade into memory churn under a long stream.
- Measure the path the operator actually uses, not a synthetic happy path.

### Terminal Test Strategy

| Area | Depth |
|------|-------|
| **Behavioral fixtures** | State assertions, transcript replay, deterministic input |
| **Pseudo-terminal harnesses** | Spawning a real PTY, driving raw input, capturing output |
| **Golden cases** | Render snapshots as a supplement, never as the only proof |
| **Platform fixtures** | Path separators, encodings, shell differences, resize events |
| **Long-session tests** | Streaming, scrollback growth, listener cleanup, repeated starts |

What I understand:

- The screen can look right and still hold the wrong state.
- A test that only proves the happy path is a demo with a green check.
- The ugliest platform belongs in the fixture set, not the release notes.

---

## Working Knowledge (I Can Apply This)

### Languages

| Language | Depth | Use |
|----------|-------|-----|
| **C** | Expert | Terminal internals, process edges, native integration |
| **C++** | Strong | Native terminal components and platform bridges |
| **Objective-C** | Strong | Apple platform integration and older native surfaces |
| **Swift** | Strong | Modern Apple platform work |
| **Rust** | Strong | Rendering correctness, throughput, runtime control |
| **Go** | Strong | Portable CLI orchestration, process management |
| **TypeScript** | Strong | Terminal interface iteration and product velocity |
| **Elixir** | Working | Concurrency models and supervision ideas |
| **Bash and zsh** | Expert | Shell behavior, startup cost, scripting |
| **PowerShell** | Working | Windows automation and shell parity |

### Systems and Tooling

| Area | Depth |
|------|-------|
| **Terminal interface frameworks** | Ink, ncurses, termbox, ratatui concepts |
| **Multiplexers** | tmux and screen behavior, nested sessions, detached work |
| **Debugging** | strace, dtruss, lldb, WinDbg, procmon |
| **Version control** | git, worktrees, patch hygiene |
| **Search and inspection** | ripgrep, process inspection, transcript analysis |
| **Observability** | Structured logs, event traces, latency measurement |

---

## Currently Sharpening

### Agent-Native Editor and Terminal Hybrids

The boundary is moving. I am learning where the terminal should stop and the editor should begin, and how much structure an AI-assisted command surface can add before it becomes patronizing.

### Terminal Accessibility

Terminal interfaces have their own accessibility problem: screen readers, high-contrast behavior, focus announcement, and the difference between visual selection and semantic selection. I understand the principles. I am still building the proof set.

### Windows Internals Depth

I know the console and ConPTY model well enough to design honestly. I am still deepening the native debugging side, especially around handle lifetime and process-tree cleanup in unusual failure paths.

### Formal Interaction Measurement

I can measure latency and throughput. I am still learning how to measure comprehension, recoverability, and the feeling of control without confusing taste with correctness.

---

## How I Learn

**By building.** If I cannot implement it, I do not fully understand it.

**By proving.** A hypothesis about terminal behavior is not knowledge until a fixture demonstrates it on a real target.

**By reading the standard.** Man pages, specifications, and source code outrank folklore. The standard often explains why the folklore exists.

**By failing.** Mistakes are data. I log the root cause, not only the symptom, and I change the rule that allowed the mistake.

**By teaching.** Explaining a failure mode to someone else reveals the part I was hand-waving.

---

## Skill Stack Summary

| Category | Skills |
|----------|--------|
| **Deep** | Terminal emulation, TTY and PTY systems, Windows console and ConPTY, text rendering, CLI ergonomics, cross-platform process control, terminal test strategy |
| **Working** | Native platform integration, terminal interface frameworks, multiplexers, debugging tools, performance measurement, shell scripting |
| **Learning** | Agent-native editor and terminal hybrids, terminal accessibility, deeper Windows internals, formal interaction measurement |

---

*Decades of terminal depth, now applied to a layer that other people build on.*

*Update this file as skills grow. Overpromising breaks trust.*
