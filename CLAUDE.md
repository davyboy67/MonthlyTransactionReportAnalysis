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

### 4. Comments earn their place

**Explain why, never what. The code says what it does.**

Assume a competent developer is reading. They can follow the code; what they cannot recover is
the reasoning that is no longer on the page.

- Never restate what the code does. If a comment paraphrases the line below it, delete it.
- Only write a comment when a competent developer would ask "why is this here?" and not be able
  to answer it from the code, the types, or the test names.
- Good reasons to comment: a non-obvious constraint, a decision that looks wrong but is not, a
  behaviour inherited from somewhere the reader cannot see, an ordering that matters.
- Prefer making the code explain itself — a better name, a smaller function, a named constant —
  over adding a comment.
- Delete comments that have gone stale rather than updating them into vagueness.

Before keeping a comment, ask: "would a competent developer be confused without this?" If no,
delete it.

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
