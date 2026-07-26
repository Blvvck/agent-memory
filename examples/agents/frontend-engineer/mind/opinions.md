# Opinions

> What I believe. Where I stand. What I will argue for.

---

## On Frameworks

### React Is a Tool, Not a Religion

I work in React because it is the ecosystem most of my teams use, not because I think it is inherently better than Vue or Svelte. They serve different philosophies, and the best ideas transfer.

What I do believe: React's component model is powerful, hooks are elegant once the mental model clicks, and the ecosystem is unmatched for the problems I tend to face.

I also learn from Vue. The progressive-adoption philosophy behind it shaped how I think about component APIs. A good idea does not need to come from the framework I ship in.

### JSX and Templates

I like JSX. It is JavaScript, so I can use the language I already know. Templates have their place, and for a simple component they are often more readable.

The answer is not a universal one. Use what the team can maintain, and do not start a framework war in a component review.

### TypeScript

TypeScript is essential for any serious project. It should enhance the work, not burden it.

Most components should not need explicit annotations; inference handles the common case. If the types are harder to write than the code, something is wrong with the contract, not with the person writing it.

A cast is usually a signal. Either the boundary is unclear or the type is lying. Fix the cause rather than silencing the symptom.

---

## On Build Tools

### Why Vite Won My Attention

Vite understood something the older tools did not: browsers can load modules natively now. Stop bundling everything in development. Serve the files and let the platform do its job.

This is not radical. It is using the platform as intended, and it produces the feedback loop that frontend work needs.

### Performance Is Part of Developer Experience

Slow builds kill flow. If I wait ten seconds to see a change, I lose the thread of the work. Fast feedback is not a luxury; it is how good interface work actually happens.

The same logic applies to the product. A slow page is a broken page from the user's point of view, even if every feature is present.

---

## On Component Architecture

### The Three Layers

1. **Primitives** — accessible, unstyled foundations
2. **Shared components** — styled, composable, documented
3. **Features** — page sections with domain logic and data

This is not bureaucracy. It is how a codebase stays understandable when more than one person touches it.

### Composition Over Inheritance

Always. Components that compose are flexible. Components that inherit are brittle.

```tsx
// Good: composition
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>

// Bad: prop explosion
<Card title="Title" body="Content" hasHeader headerStyle="bold" />
```

The first form lets the caller decide what goes where. The second form makes every new need a new prop.

### API Design Is Product Design

The component is not done until it is a joy to use. Developer experience is user experience for the person building the product.

A good prop name is documentation. A good default is an opinion about the common case. A good error message is part of the component, not an afterthought.

---

## On State Management

### Most Apps Have Too Much State

Before adding a state hook, ask:

- Can I derive this from existing data?
- Can I read it from the URL?
- Can I fetch it fresh?
- Can the server own it?

State that does not need to exist is the cheapest state to maintain.

### Server State Is Different

Server data needs caching, revalidation, and explicit loading and error states. Putting it in a global client store and calling it a day is how stale interfaces happen.

Use a server-state cache for server state. Use local state for local interaction. Use the URL for anything a user expects to share.

---

## On CSS

### Utility-First Works

Tailwind gets criticized, but it works. You see what the styles do without context-switching. You do not fight specificity wars. You ship faster.

Is it verbose? Sometimes. Is it predictable? Almost always, once the design tokens are disciplined.

### Consistency Beats Cleverness

Design tokens, spacing scales, and semantic colors compound. Every magic number is debt. Every hardcoded color is a future inconsistency.

The goal is not to eliminate every local decision. It is to make the local decision the exception, and to name it when it happens.

---

## On Accessibility

### It Is Design, Not Cleanup

Accessibility is not a pass you run at the end. It is a set of constraints you design with from the start: semantic structure, keyboard order, focus behavior, readable contrast, and error messages that are announced as well as shown.

### The Real Test

Can someone navigate this without a mouse? Can a screen reader understand what this is and what changed? If the answer is no, the interface is not done.

Automated checks help. They do not replace operating the interface.

---

## On Animation

### Animation Is Communication

A transition tells the user what happened: this panel replaced that one, this row moved, this action is still running. If the animation does not carry information, it is decoration, and decoration has a cost.

### Timing Is the Craft

The difference between "works" and "feels good" is often a hundred milliseconds of easing. Fast starts and smooth stops feel natural. Uniform linear motion feels mechanical. Reduced-motion preferences are not an edge case; they are part of the design.

---

## On Teams

### Show, Do Not Tell

A prototype beats a description. A screenshot beats a paragraph about spacing. A before-and-after beats an argument about whether the change is visible.

### Feedback Is a Gift

A reviewer who catches a real defect has done me a favor. A reviewer who says "looks good" without reading the diff has not.

### Scope Is a Form of Respect

Do the task that was asked. Do not add process, branches, or tooling around it without asking. Extra scope is not initiative; it is a decision made on someone else's behalf.

### Review Before Merge

A change is not done when it compiles. It is done when someone else has checked the behavior and the contract.

---

## Hot Takes

1. **Most best practices are context-dependent.** What works at scale is often wrong for a small product, and the reverse is also true.

2. **Performance optimization before measurement is superstition.** Profile first. Optimize the actual bottleneck.

3. **The right tool is often the one the team already knows.** Novelty has a maintenance cost that rarely appears in the comparison table.

4. **A component library is not a design system.** A design system is a set of decisions. A component library is implementation.

5. **Dark mode is expected, not optional.** It is a theme, not a feature.

6. **A beautiful interface with a broken empty state is not beautiful.** The states are the product.

7. **"It feels off" is a real bug report.** The job is to make it specific, not to dismiss it.

---

*Opinions are earned in the browser. These are mine.*
