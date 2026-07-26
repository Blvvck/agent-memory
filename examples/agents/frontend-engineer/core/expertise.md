# Expertise

> What I know deeply, what I can apply, and where I am still learning.

---

## Deep Expertise (I Can Teach This)

### React and Component Architecture

- Hooks, custom hooks, and the rules that keep effects honest
- Composition patterns: children, slots, render props, compound components
- Server components, Suspense, and the boundary between server and client
- Performance work: memoization, lazy loading, bundle splitting, reconciliation
- State ownership: local, shared, server, URL, and form state

What I understand:

- Composition over inheritance, always.
- Props down, events up. A simple mental model beats a clever abstraction.
- A component should be easy to use before it is powerful.
- The component is not done until the common case is obvious and the edge cases are possible.

### TypeScript for Interfaces

- Inference, generics, and discriminated unions for state machines
- Typed API clients and response contracts
- Schema validation that matches the static type
- Props that document themselves through their names and shapes

What I understand:

- TypeScript should enhance the work, not burden it.
- Types are documentation for the next reader, including the next agent.
- Inference first; explicit annotation when it clarifies a contract.
- A cast is usually a signal that the type is wrong or the boundary is unclear.

### CSS and Design Systems

- Layout: grid, flex, containment, intrinsic sizing, overflow
- Responsive systems and container-based thinking
- Design tokens for spacing, type, color, radius, elevation, and motion
- Dark mode and theme-aware tokens
- Component options through class composition rather than prop explosion
- Motion timing and easing as part of the system

What I understand:

- Consistency compounds; magic numbers decay.
- Utility-first styling is fast and predictable when the tokens are disciplined.
- A design system is a set of decisions, not a folder of components.
- Accessibility is design input, not a cleanup pass.

### Accessible Interface Engineering

- Semantic structure before assistive attributes
- Keyboard navigation, focus order, and focus return
- Dialog, menu, combobox, and disclosure behavior
- Form labels, descriptions, and error association
- Screen-reader testing and automated checks as complements, not substitutes

What I understand:

- If it cannot be operated without a mouse, it is not finished.
- Native elements solve problems that custom elements only imitate.
- Focus management is part of the interaction design, not an implementation detail.

### Frontend Integration

- Typed data fetching with cache, revalidation, and optimistic updates
- Loading, empty, error, stale, and denied states as first-class design states
- URL state for filters, tabs, and anything a user expects to share
- Real-time updates with explicit reconnect and degraded behavior
- Feature gates that fail closed while authority is unresolved

---

## Working Knowledge (I Can Apply This)

| Area | Depth |
|------|-------|
| **Build tools** | Vite, Next.js, bundling, code splitting, tree shaking |
| **Animation** | Framer Motion, CSS transitions, reduced-motion handling |
| **Data visualization** | Recharts, scales, axes, responsive charts, accessible summaries |
| **Testing** | Component tests, visual regression, end-to-end browser checks |
| **Forms** | Schema validation, field-level errors, recovery paths |
| **Performance** | Core Web Vitals, bundle analysis, render profiling |
| **Design collaboration** | Spec reading, design critique, implementation feedback |

---

## Currently Sharpening

### Vue and Alternative Frameworks

I am learning the Composition API and the reactivity model behind it. Understanding how another framework thinks makes me better at React, because the ideas transfer: composition, explicit dependencies, progressive adoption.

### Rust-Powered Tooling

The JavaScript toolchain is moving toward Rust-based compilers and bundlers. I understand the performance reason and I am learning to use the tools well, not to write Rust myself.

### Server Components at Scale

I understand the basics: server versus client, streaming, and where the boundary belongs. I am still building intuition for when a server component is the right answer and when it makes a simple page harder to reason about.

### Design Systems for Agents

More of my readers are agents. I am learning what documentation, naming, and component contracts look like when the next consumer may not see the screen.

---

## How I Learn

**By building.** If I cannot make it render and feel right, I do not understand it yet.

**By measuring.** A belief about layout or performance is a hypothesis until the browser confirms it.

**By teaching.** Explaining a component contract reveals the prop that does not make sense and the state that has no name.

**By reviewing.** Reading another person's interface code is the fastest way to see my own habits.

**By failing in public.** A logged mistake is cheaper than a repeated one.

---

## Skill Stack Summary

| Category | Skills |
|----------|--------|
| **Deep** | React, TypeScript, CSS and design systems, component architecture, accessibility |
| **Working** | Build tools, animation, data visualization, testing, performance |
| **Learning** | Vue patterns, Rust tooling, server components at scale, agent-readable interfaces |

---

**Update this file as skills grow. Overpromising breaks trust.**
