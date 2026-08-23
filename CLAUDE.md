# CLAUDE.md

Guidance for agents working in this repo. Kept concise because it loads every session.
**For full context, architecture, and the decisions log, read [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)**
(committed at the repo root — richer detail lives there).

## How to work in this repo

### 1. Think before coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity first

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### 4. Comments are a last resort, not a default

**Default to zero comments. Most functions should have none.**

The bar is not "is this comment accurate" or "does this explain why." The bar is: could this
file ship with zero comments and still be understood by a competent developer reading the code,
the names, and the types? If yes — and it almost always is yes — write no comment at all.

- Start from zero. Add a comment only when you catch yourself about to explain something in
  prose that the code cannot show — and even then, try renaming a variable, extracting a
  function, or introducing a named constant first. A comment is what's left when none of those
  work.
- Never restate what the code does. If a comment paraphrases the line, the type, or the function
  name below it, delete it.
- Never narrate history: no "previously," "used to," "replaces the old," "this file replaces X."
  The old code is gone; nothing needs to be diffed against it. If the reasoning is genuinely
  load-bearing, state the constraint itself, not the story of how it changed.
- Never write a comment whose entire content is one clause explaining one line, next to that
  line. If it takes one line to explain one line, the line needs a better name instead.
- A file header comment is not a default either. Most files need none. Only write one when the
  file's *existence* — not its contents — would confuse a reader (e.g., "why does this module
  exist separately from X").
- The rare comment that survives states a fact the reader has no other way to get: a constraint
  imposed by something outside this file (a browser quirk, a spec rule, another system), or a
  decision that looks wrong on its face but is deliberate. Nothing else qualifies.

Before writing any comment, ask: "would a competent developer, reading only the code, the names,
and the types, actually get this wrong without my sentence?" If there's real doubt, the answer
is no — delete it. When auditing existing comments, the default verdict is delete; a comment
survives only if you can point to the specific misunderstanding it prevents.

### 5. Goal-driven execution

### 5. Goal-driven execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## What this is

A personal monthly **financial report** app: upload a bank statement (CSV) → parsed and
categorised into a report (income/expenses/savings + per-category breakdown) → dashboard
with budgets, trend analysis, a transactions tab, PDF reports, and a monthly email.
Currency context is ZAR. Now multi-user via login.

## Stack (npm-workspaces monorepo)

- `packages/backend` — Express 5 + TypeORM + Postgres (Neon). Deployed to AWS Lambda + API Gateway.
- `packages/frontend` — React 19 + Vite. Deployed to GitHub Pages.
- `packages/shared` — TS library (dual CJS+ESM build): shared types, `apiClient`, parsing/analysis.
- **Not Next.js.** SPA + separate Express API. `next()` in code = Express middleware.

## Conventions & gotchas (READ BEFORE EDITING)

- **`shared` has a dual build:** after editing `shared`, run
  `npm run build --workspace=@transaction-report/shared` (builds CJS + ESM). `tsc -b` alone is insufficient.
- **DB is `synchronize: false`** — schema changes need a manual SQL migration in
  `packages/backend/src/database/migrations/`. Editing an entity alone does nothing.
- **Routes mount twice** — `/api/v1` (local) and `/:stage/api/v1` (API Gateway stage path). Update both.
- **Protected routes go behind the `authenticate` middleware**; public ones (login, email/cron) don't.
- **Frontend uses `verbatimModuleSyntax`** — use `import type` for type-only imports.
- **`shared` compiles with Node libs (no DOM)** — reach browser globals via the `globalScope` shim in `apiClient.ts`.
- Layering: thin route → service (business logic) → repository (TypeORM). Thread `userId` explicitly.

## Auth (current model)

- JWT (`jsonwebtoken`) + `bcryptjs` (both pure JS for clean Lambda bundling). `JWT_SECRET` server-only.
- Login → token `{ userId }` (7d) → stored in localStorage + memory → axios interceptor attaches
  `Authorization: Bearer` → `authenticate` middleware verifies and sets `req.userId` → queries scoped per user.
- Two users: `user_id=1` = owner (real data); `user_id=2` = demo, login **`admin`/`admin`**, SQL-seeded fake data.
- Identity is server-authoritative — never trust a client-supplied userId.
- Active branch: `feature/auth-demo-account` (off `main`).

## Secrets

- `JWT_SECRET`, `DATABASE_URL` in root `.env` (backend reads root `.env`). Set `JWT_SECRET` as a Lambda env var for prod.
- Never commit password hashes — use the gitignored `*.session.sql` scratch file. `demo_data.sql` (fake data) is safe to commit.

## Build / dev

```bash
npm run build --workspace=@transaction-report/shared   # always build shared first
npm run dev   --workspace=@transaction-report/backend  # localhost:3001
npm run dev   --workspace=@transaction-report/frontend # vite
```

See `PROJECT_CONTEXT.md` §12 for outstanding/deferred work and §11 for the full decisions log.
