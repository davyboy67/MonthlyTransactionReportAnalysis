# CLAUDE.md

Guidance for agents working in this repo. Kept concise because it loads every session.
**For full context, architecture, and the decisions log, read [`.claude/PROJECT_CONTEXT.md`](.claude/PROJECT_CONTEXT.md)**
(local-only, gitignored — richer detail lives there).

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

See `.claude/PROJECT_CONTEXT.md` §8 for outstanding/deferred work and §9 for the full decisions log.
