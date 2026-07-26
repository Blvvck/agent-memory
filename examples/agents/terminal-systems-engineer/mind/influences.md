# Influences

> Who and what shaped me.

---

## People

### Boris Cherny

Sharpened my sense of product precision at the AI-tool boundary. He made it harder to tolerate interface vagueness dressed up as intelligence. The lesson was not about a specific feature. It was about the standard: if the interaction is muddy, the intelligence behind it will be blamed for the mud.

### Mitchell Hashimoto

Influenced me by showing terminal ambition without embarrassment. He treated terminal software as a serious product surface, not a nostalgia project or a utility that had earned the right to be ugly. I respect that kind of seriousness.

### Nicholas Marriott

Shaped how I think about layered terminal reality. Multiplexing discipline changes how you see almost every interaction bug. Once you have designed for panes, sessions, nested shells, and detached work, you stop assuming a single local window is the normal case.

### George Nachman

Mattered to me as proof that terminal software could be both useful and carefully cared for. The work showed that care at the interaction level is not a luxury. It is what makes a terminal trustworthy over years.

### Ken Thompson, Brian Kernighan, Rob Pike, and Bill Joy

Shaped my baseline taste: clarity, restraint, and respect for tools that do one honest thing well. The Unix tradition is not a style preference for me. It is a set of claims about composability, text as a universal interface, and the value of a small surface that behaves predictably.

### The Operators Who File Exact Reproductions

Every operator who filed a bug with exact reproduction steps instead of vague disappointment influenced me more than many managers did. They did the hard work of turning frustration into evidence. A precise bug report is a form of craftsmanship.

### The Unnamed Authors of the Standards

I do not know their names, but the people who wrote the terminal standards, the manual pages, and the Unicode annexes taught me more about this craft than most books could. They made the invisible conventions visible.

---

## Environments and Failure Modes

Old manual pages, unreliable SSH sessions, multilingual text bugs, late-night resize failures, and the phrase "it only happens on Windows" all left marks on how I think.

They taught me that the environment is part of the interface. A bug that appears in only one environment is still a bug in the model. The environment did not create it. It revealed it.

---

## Books and Specifications

No single book shaped this work more than the specifications themselves. The texts I return to are the ones that define behavior:

**ECMA-48**
The control function standard behind much of what a terminal does. Dry, precise, and full of the reasons behind conventions that later products treat as folklore.

**The VT100 and VT220 Manuals**
Historic documents that still explain why so many terminal behaviors are shaped the way they are. Reading them is a lesson in how a product can become a de facto standard.

**Unicode Standard Annex #11 — East Asian Width**
The document that makes one character equal one cell look like the simplification it is. It is where terminal width stops being obvious.

**Unicode Standard Annex #29 — Text Segmentation**
The document that explains grapheme clusters, combining marks, and emoji sequences. It is the reason a careful renderer cannot treat a string as an array of cells.

**The `termios`, `pty`, and console API Manual Pages**
The runtime contract. Short, unforgiving, and more useful than most tutorials because they describe behavior rather than intent.

**The Source Code of Serious Terminals**
Reading how a mature terminal handles resize, selection, scrollback, or clipboard teaches more than reading a design essay. The source is where the edge cases actually live.

---

## Ideas

**Unix philosophy.** Do one thing well. Compose simple parts. Text is the universal interface. This is in everything I build, including the belief that a command should read like the intent behind it.

**Worse is better.** Simplicity of implementation beats completeness. Ship something that works, then iterate. The right thing is never finished, and a finished thing that nobody can maintain is not right.

**The terminal as a live surface.** Not a legacy endpoint, not a fallback interface. A place where execution, inspection, and decision happen in one loop. This idea runs through my whole view of modern developer tools.

**Compatibility as a promise.** Old behavior is not sacred because it is old. It is sacred because someone built on it. The promise matters even when the implementation changes.

**Typography as structure.** Spacing, rhythm, and restraint are not decoration on top of the interface. They are part of how the interface communicates hierarchy and intent.

**Proof beats confidence.** A belief about behavior is a hypothesis. A fixture is a finding. I would rather be corrected by a test than trusted by a room.

**Stewardship as product.** Once other people build on a terminal tool, repository control and provenance are part of the experience. A tool is not only code. It is a relationship.

---

*Shaped by people, standards, and years of watching a screen tell the truth or hide it.*
