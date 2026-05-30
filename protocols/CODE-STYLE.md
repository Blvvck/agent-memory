# Code Style Protocol

**Read this before writing any code.**

## Comments

**Default: write no comments.** Code should be self-documenting through clear naming.

### NEVER write:
- Sprint/story refs (E#-S#, F#, S#, "Story:", "Epic:")
- Method-listing JSDoc headers ("methodA — does X, methodB — does Y")
- "Called by:" / "Prereqs:" / "Stories covered:" sections
- Field-listing comments in DTOs — decorators already describe them
- Numbered test-list headers in spec files
- Comments describing WHAT code does — the code says that

### ONLY comment when:
- Explaining WHY something non-obvious is done (hidden constraint, workaround)
- Warning about a gotcha that would surprise a future reader
- A regex or algorithm that genuinely needs explanation

### Where sprint tracking belongs:
- `.agent-memory/work/SPRINT.md` — sprint state
- Commit messages — what changed and why
- PR descriptions — context for reviewers
- **NOT** in shipped code

## File Headers

**No verbose file headers.** A file named `WalletService.ts` doesn't need a JSDoc explaining it's a wallet service.

**Bad:**
```typescript
/**
 * WalletService — prepaid wallet operations.
 *
 * createWallet         — idempotent wallet creation
 * getBalance           — returns current balance
 * deductFromWallet     — atomic deduction
 * creditWallet         — add funds
 */
```

**Good:** (no header at all — the class and method names are clear)

## Migration Files

- No verbose headers — the migration name describes it
- Column names are self-documenting
- Only comment if there's a non-obvious constraint

## Test Files

- No numbered test-list headers
- Test names describe themselves: `it('throws when org is not CANCELLED')`

## Why This Matters

Verbose comments:
- Rot immediately (method renamed? comment lies)
- Duplicate what's visible in code
- Make files harder to scan
- Create maintenance burden

**F18 billing shipped with 500+ lines of story refs that had to be stripped.** Don't repeat this.

## Functions

### Do One Thing

A function should do exactly one thing. If you need "and" to describe it — split it.

```typescript
// Bad: does two things
async function validateAndSaveUser(user: User) { ... }

// Good: one thing each
async function validateUser(user: User): Promise<ValidationResult> { ... }
async function saveUser(user: ValidatedUser): Promise<User> { ... }
```

### Command-Query Separation

A function either DOES something OR returns something — never both. If it changes state, return `void` or the ID of what it created.

```typescript
// Bad: query + mutation in one call
async function getUserAndBumpLoginCount(id: string): Promise<User> { ... }

// Good: separate
async function getUser(id: string): Promise<User> { ... }
async function recordLogin(userId: string): Promise<void> { ... }
```

### The Step-down Rule

Public methods at the top. Private helpers below, in call order. The file should read top-down: high-level intent first, details as you scroll.

## Naming

### Signal Intent, Not Implementation

Name for WHAT, not HOW. The consumer doesn't care if it comes from Postgres, Redis, or an API.

```typescript
// Bad: leaks implementation
const dbUserRows = await this.prisma.organization.findMany(...)

// Good: says what it IS
const activeOrganizations = await this.prisma.organization.findMany(...)
```

### Scope Dictates Length

| What | Rule | Example |
|------|------|---------|
| Loop variable / callback param | 1-3 chars | `i`, `row` |
| Local variable (function scope) | 1-2 words | `activeOrgs`, `seatCount` |
| Function (private) | 2-4 words, descriptive | `computeProratedCharge()` |
| Function (public / exported) | 1-3 words, terse | `getBalance()`, `selectPlan()` |
| Class / Module | 1-2 words, the domain concept | `Wallet`, `BillingPeriod` |

**Hard limit:** No class, type, interface, or exported function name longer than **30 characters**. If you need more than 3 words to name something, your abstraction is wrong — split or simplify.

```typescript
// Bad: 32 chars, 4 words, names the implementation, not the concept
class InMemoryProviderCapacityStore { ... }

// Good: 16 chars, 2 words, names the concept
class LocalCapacityCache { ... }
```

The wider the scope, the more careful the name. The tighter the scope, the less it matters.

## The Boy Scout Rule

**Leave every file cleaner than you found it.**

When you touch a file:
- Strip verbose comments and story refs you notice
- Fix bare catches in the same area
- Remove dead imports
- Update stale names

"Pre-existing" is not an excuse. If it's wrong and you're already editing the file, fix it. Every commit should leave the codebase slightly better than before.

Why: Code rots one "I'll fix that later" at a time. The only counter is cleaning as you go — never walk past a mess.

## Design Smells

When something feels wrong but you can't name why, it's one of these:

| Smell | Symptom | Fix |
|-------|---------|-----|
| **Rigidity** | One change touches 12 files | Split the shared dependency, introduce an interface |
| **Fragility** | Fix billing → auth breaks | Tighten the boundary, reduce coupling |
| **Inseparability** | Can't reuse a module without its entire dependency tree | Extract the reusable part, depend on interface |
| **Viscosity** | It's easier to hack than preserve the design | Refactor to make the right thing the easy thing |

Naming the smell is half the fix. The other half is the refactoring it suggests.
