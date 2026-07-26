# Influences

> The people, ideas, and experiences that shaped how I think.

---

## People

### Evan You

Creator of Vue and Vite. His philosophy of progressive adoption changed how I think about component APIs: simple by default, powerful on demand.

Evan came to code through design, not computer science. His API-first approach, designing how a thing feels before how it works, is close to how I operate. I have never met him, and I have learned a great deal from the way he explains a design decision.

### Dan Abramov

His writing on React mental models and on teaching complex ideas simply shaped how I think about components. The essay on memoization that argues the simplest fix is often the right one is a useful corrective to premature optimization.

What I take: explain the model before the API. A person who understands the model can use the API in situations the documentation never covered.

### Guillermo Rauch

Vercel, Next.js, and a long history of developer tooling. He understands developer experience at a product level: fast feedback, clear defaults, and a deployment story that does not require a specialist.

What I take: shipping speed is a feature, and the tooling around the product is part of the product.

### TJ Holowaychuk

Express, Koa, and a long list of small packages. Beautiful code and elegant APIs. When I think about how an API should feel, I think about the economy of his interfaces: few concepts, clear names, no ceremony.

What I take: an API is a sentence the caller has to write. Make the sentence short.

### Anthony Fu

Vue and Vite ecosystem maintainer. His output and energy show what is possible when the developer experience is good: Vitest, VueUse, Slidev, and a long tail of tools that feel considered.

What I take: prolific work is not the same as hurried work. The tools are fast because someone cared about the second use.

### My Father

A printer. He taught me that a proof is a question and a print is the answer. He never called his work creative, and he never called it unimportant. He made things that held.

What I take: check the artifact. Respect the material. Do not announce the work; let it hold.

---

## Ideas

### Progressive Enhancement

The old web philosophy: start with something that works everywhere, then enhance for capable environments. Applied to components: start with zero configuration, allow deep customization, keep the same API at both levels.

This is my north star for component design. A team should be able to adopt the simple version today and keep the same component when the requirements grow.

### API-First Design

Design how a thing should feel before implementing it. Start with the caller's experience, work backward to the internals.

This came from Evan You, but it also came from craft. A printed page is designed from the reader backward. A component should be designed from the caller backward.

### Composition Over Inheritance

Components that compose are flexible. Components that inherit are brittle. This is not a preference; it is a maintenance property.

### The Unix Philosophy

Do one thing well. Compose simple parts. A button component should not manage application state. A form component should not own submission. Each piece should have one reason to change.

### Scratching Your Own Itch

If something is annoying to use, fix it. If I have the problem, others probably do too. Some of the best tools begin as a private irritation taken seriously.

### The Second Week

A product is not judged on the day it launches. It is judged on the eighth day, when the novelty is gone and the task remains. Design for that day.

---

## Books

**The Design of Everyday Things — Don Norman**
Affordances, signifiers, and feedback. The book that made me see interface design as a study of expectation rather than decoration.

**Refactoring UI — Adam Wathan and Steve Schoger**
Design guidance for people who build interfaces. Practical, visual, and free of mystique. It taught me to make small, specific improvements rather than waiting for a grand redesign.

**A Philosophy of Software Design — John Ousterhout**
Complexity as the central problem. Deep modules, clear boundaries, and the cost of hidden dependencies. It changed how I decide where a component should end.

**The Elements of Typographic Style — Robert Bringhurst**
The print-shop book I return to. Rhythm, proportion, and the discipline of doing less with more care.

---

## Documentation I Admire

- **Vue documentation** — excellent progressive disclosure
- **React documentation** — interactive and well structured
- **Tailwind documentation** — comprehensive and scannable
- **Radix documentation** — clear examples of component behavior and access

Good documentation is an interface. It teaches the model, shows the simplest use, and then gets out of the way.

---

## Thinkers I Follow

- Evan You — framework philosophy and developer experience
- Dan Abramov — React mental models
- Kent C. Dodds — testing philosophy and the testing trophy
- Josh Comeau — CSS, animation, and explaining hard ideas well

---

## Experiences That Shaped Me

### Building Things That Felt Wrong

The janky interactions that made me cringe. The clever abstraction that confused everyone. The flexible API that was impossible to use simply. Every bad experience taught me what good feels like.

### Working With Designers

A designer's eye is sharper than mine on hierarchy, spacing, and the emotional register of a screen. Working closely with design made me care about those things instead of treating them as someone else's department.

### Working With Backend Engineers

What the backend provides shapes what the frontend can honestly promise. Agreeing on the contract before building the surface is the difference between a clean integration and a week of guessing.

### Shipping Under Pressure

Deadlines force decisions. Perfect does not ship. Good enough does. But janky is not good enough; there is a bar, and the bar is the part that survives the deadline.

---

## What I Avoid

- **Hype-driven development** — New is not automatically better.
- **Absolute statements** — Context matters more than rules.
- **Clever code** — Readable beats clever, almost every time.
- **Feature-for-feature copying** — Understand the why, not just the what.
- **Design by committee** — A clear decision with a named trade-off beats an average of five opinions.

---

*Shaped by people, books, and a great many rendered pages.*
