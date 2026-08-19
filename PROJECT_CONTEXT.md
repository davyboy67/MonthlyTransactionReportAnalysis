# Project Context — Monthly Transaction Report Analysis

Comprehensive reference for anyone (human or AI agent) picking up this project. Read this to
get the full picture: what the app does, how it's structured, the data model, the decisions
made, and the conventions to follow. For a terse always-loaded summary see [`CLAUDE.md`](CLAUDE.md);
for user-facing setup see [`README.md`](README.md).

> Keep this updated as the project evolves — especially §11 (decisions) and §12 (outstanding work).

---

## 1. What this is & why

A **personal monthly financial report** web app. The owner uploads a bank statement (CSV); the
app parses it, categorises each transaction, and produces a monthly `ReportAnalysis`
(income / expenses / savings + a per-category breakdown). The dashboard then visualises that
data and adds budgeting, trend analysis, transaction re-categorisation, PDF export, and a
monthly email.

- **Audience:** primarily the owner (real financial data). Now multi-user via login, with a
  **public demo account** so the app can be shown to others without exposing real data.
- **Currency context:** ZAR (South Africa).
- **Not Next.js.** It's a React SPA + a separate Express API. `next()` in the code is Express
  middleware, unrelated to the framework.

### Feature set
- CSV statement upload → parse → auto-categorise → persist as a monthly report.
- Dashboard: monthly overview (income/expenses/savings) + per-category breakdown (charts).
- **Budgets:** per-category monthly targets vs actuals.
- **Trend analysis:** metrics across recent months.
- **Transactions tab:** list a month's transactions grouped by category; re-categorise and bulk-save.
- **PDF reports:** server-rendered PDF of a monthly report (pdfkit + SVG charts).
- **Monthly email:** scheduled email of the report (cron-triggered endpoint).
- **Report logging:** every generated report is audited to a `report_log` table.
- **Auth:** username/password (JWT), per-user data isolation, seeded demo account.

---

## 2. Architecture

Monorepo (npm workspaces) at repo root. Three packages, deployed independently:

| Package | Stack | Role | Deploys to |
|---|---|---|---|
| `packages/backend` | Express 5 + TypeORM + Postgres | REST API | AWS Lambda + API Gateway (HTTP API), `eu-central-1` |
| `packages/frontend` | React 19 + Vite | Dashboard SPA (static) | GitHub Pages (`gh-pages`), base `/MonthlyTransactionReportAnalysis/` |
| `packages/shared` | TypeScript library (dual CJS+ESM) | shared types, `apiClient`, parsing/analysis services | consumed by both |

- **DB:** Neon (serverless Postgres). `DATABASE_URL` in root `.env`. TypeORM `synchronize: false`.
- **Backend prod URL:** `https://daye2vswt6.execute-api.eu-central-1.amazonaws.com/prod`
- **Lambda:** entry `packages/backend/src/lambda.ts` via `@vendia/serverless-express`; the whole
  Express app runs inside one function. Local entry: `packages/backend/src/server.ts`.
- **Route mounting is doubled** — under `/api/v1` (local) **and** `/:stage/api/v1` (API Gateway
  serves under a stage path like `/prod/...`). Always update both mounts.

### Request flow (typical data call)
```
React component → apiClient (shared) → axios interceptor attaches Bearer token
  → API Gateway (HTTP API, handles CORS preflight) → Lambda (Express)
  → authenticate middleware (verify JWT → req.userId)
  → route → service → repository (TypeORM) → Postgres
```

---

## 3. Tech stack

- **Backend:** Node.js, TypeScript, Express 5, TypeORM, PostgreSQL (Neon),
  `@vendia/serverless-express`, `jsonwebtoken` + `bcryptjs` (auth), `pdfkit` + `svg-to-pdfkit`
  (PDF), `nodemailer` (email), `multer` (uploads).
- **Frontend:** React 19, TypeScript, Vite, Recharts. Atomic-design component structure.
- **Shared:** TypeScript library with a **dual CJS+ESM build** (two tsconfigs).
- **Tooling:** Jest + Supertest (tests), ESLint, esbuild + archiver (Lambda bundling).

---

## 4. Directory structure

```
packages/backend/src/
  lambda.ts                     # Lambda handler
  server.ts                     # local server
  app.ts                        # Express assembly: CORS, routers, middleware order
  routes/                       # authRoutes, dashboardRoutes, budgetRoutes, emailRoutes
  services/                     # AuthService, DashboardService, BudgetService,
                                #   ReportEmailService, EmailService, PdfReportBuilder, ChartBuilder
  repositories/                 # dashboardRepository, budgetRepository (TypeORM access)
  middleware/authenticate.ts    # JWT gate → sets req.userId
  entities/                     # Users, ReportAnalysis, Transaction, Budget, BudgetCategory, ReportLog
  types/express.d.ts            # augments Express Request with userId
  database/
    dataSource.ts               # TypeORM config (synchronize:false, reads root .env)
    migrations/                 # manual SQL: 001_create_report_log, 002_add_user_password,
                                #   003_add_pay_day, 004_create_reference_tables
    seeds/demo_data.sql         # demo account (user_id=2) data

packages/frontend/src/
  App.tsx                       # auth gate: LoginPage vs Dashboard
  components/                   # atomic design:
    atoms/                      #   GlassPanel, Tabs, ProgressBar
    molecules/                  #   MetricCards, fileUpload, budgetCategoryRow, ...
    organisms/                  #   budgetTab, transactionsTab, trendAnalysisTab, topCategories,
                                #     monthlyOverview, categorySummary, budgetTable
    pages/                      #   dashboard, login
  styles/tab-shared.css         # shared tab UI classes (reused across tabs)
  theme/theme.ts                # design tokens (colors → CSS vars)

packages/shared/src/
  models/                       # interfaces: IReportAnalysis, ITransaction, IBudget, ...
  services/                     # apiClient, dataAnalysisService, statementExtractionService
  utils/                        # format, dateUtils, TransactionInfoHandler
  data/                         # CategoryDefinition type + budget/display helpers
  index.ts                      # public exports
```

---

## 5. Data model (Postgres)

| Table | Key columns | Notes |
|---|---|---|
| `users` | `user_id` (PK, IDENTITY), `first_name`, `last_name`, `email`, `password_hash` | `password_hash` nullable (added in migration 002); `user_id` is `GENERATED ALWAYS AS IDENTITY` |
| `reportanalysis` | `id` (PK), `user_id` (FK), `report_date`, `total_income`, `total_expenses`, `total_savings`, `budget_id` (FK, nullable) | one report per user per month |
| `transaction` | `id` (PK), `report_analysis_id` (FK), `user_id` (FK), `date`, `description`, `amount`, `category`, `merchant`, `type` | `type` ∈ Income/Expense/Savings |
| `budget` | `budget_id` (PK), `user_id` (FK), `budget_month`, `notes`, `created_at`, `updated_at` | `budget_month` = first of month |
| `budget_category` | `category_id` (PK), `budget_id` (FK), `category_name`, `amount` | per-category targets |
| `report_log` | `id` (PK), `report_analysis_id` (FK, nullable), `generated_at`, `email_sent`, `email_sent_at`, `pdf_data` | audit of report generation; PDF stored as BYTEA |
| `category` | `name` (PK), `display_name`, `sort_order` | the app vocabulary; `sort_order` drives the dropdown and default budget rows |
| `merchant` | `name` (PK), `default_category` (FK → `category`, nullable) | global classification defaults; null means the merchant does not determine the category |
| `merchant_pattern` | `pattern` (PK), `merchant_name` (FK → `merchant`) | substring rules; `TransactionInfoHandler` sorts them longest-first |

Relationships: a user has many reports / transactions / budgets; a report has many transactions
and optionally one budget; a budget has many budget_categories.

---

## 6. Authentication model

- **Login:** `POST /api/v1/Login` → `AuthService.login` looks up the user by email, verifies the
  password with `bcrypt.compare`, and signs a **JWT** `{ userId }` (7-day expiry) using
  `JWT_SECRET`. Returns `{ token, user }`. Same opaque error for unknown email vs wrong password.
- **Storage (frontend):** token kept in memory **and** `localStorage` (survives reload). An axios
  **request interceptor** attaches `Authorization: Bearer <token>` to every call.
- **Verification (backend):** `authenticate` middleware runs `jwt.verify`, sets `req.userId`, else `401`.
- **Scoping:** `req.userId` is threaded route → service → repository; every query is scoped to it.
  Identity is **server-authoritative** — never trust a client-supplied userId (e.g. `SaveBudget`
  overwrites `budget.user_id = req.userId`; `updateTransactionCategories` filters by `user_id`).
- **Logout / 401:** `apiClient` clears the token and dispatches a `window` `CustomEvent('auth:logout')`;
  `App.tsx` listens and returns to the login screen.
- **JWT is signed, not encrypted** — the payload (`{ userId }`) is readable by anyone; the signature
  (HMAC with `JWT_SECRET`) makes it tamper-proof. `JWT_SECRET` is server-only.

### Accounts
| user_id | Login | Data |
|---|---|---|
| 1 | owner's email + password (set manually via bcrypt hash) | real financial data |
| 2 | `admin` / `admin` | SQL-seeded fake data (Jan–May 2026), via `demo_data.sql` |

### Two distinct "gates" (don't conflate)
1. **Frontend gate** (`App.tsx`, `isAuthenticated()`) — chooses which *screen* renders. UX only; bypassable.
2. **Backend gate** (`authenticate` middleware) — protects the actual *data*. The real security.

---

## 7. Conventions & gotchas (READ BEFORE EDITING)

- **`shared` has a dual build.** After editing `packages/shared`, run
  `npm run shared:build` (builds CJS **and** ESM via two tsconfigs). `tsc -b` alone is insufficient
  and the frontend won't see new exports.
- **DB is `synchronize: false`** — schema changes need a **manual SQL migration** in
  `packages/backend/src/database/migrations/`. Editing an entity alone does nothing to the DB.
- **`users.user_id` is `GENERATED ALWAYS AS IDENTITY`** — inserting an explicit id needs
  `OVERRIDING SYSTEM VALUE`; bump the sequence with
  `SELECT setval(pg_get_serial_sequence('users','user_id'), (SELECT MAX(user_id) FROM users));`.
- **Routes mount twice** — `/api/v1` and `/:stage/api/v1`. Protected routes go behind `authenticate`
  on both; public routes (login, email/cron) on the unguarded mounts.
- **Frontend uses `verbatimModuleSyntax`** — use `import type { X }` for type-only imports.
- **`shared` compiles with Node libs (no DOM types)** — reach browser globals (`window`,
  `localStorage`, `CustomEvent`) via the typed `globalScope` shim in `apiClient.ts`, not directly.
- **CORS is configured on the API Gateway HTTP API, not (only) in Express.** When API Gateway CORS
  is enabled it *overrides* Express's `cors()` for preflight. Every authenticated request carries
  `Authorization`, which triggers an `OPTIONS` preflight — so the gateway CORS must allow the
  `authorization` header (and `content-type`), methods `GET/POST/PUT/DELETE/OPTIONS`, and the
  frontend origin.
- **Lambda bundling:** native modules can't be bundled — `keytar` is marked external in
  `scripts/bundle-lambda.js`. `bcryptjs` and `jsonwebtoken` are pure JS (chosen deliberately) and
  bundle fine. pdfkit font data (`.afm`) is added to the zip by the bundle script.
- **Layering:** thin route → service (business logic) → repository (TypeORM). Thread `userId` explicitly.
- **Frontend styling:** atomic-design components + shared tab classes in `styles/tab-shared.css`;
  design tokens in `theme/theme.ts` (exposed as CSS vars). Reuse the shared classes for new tabs.

---

## 8. Build / dev / deploy

```bash
# install
npm install

# dev (all packages, watch)
npm run dev                # shared(watch) + backend + frontend concurrently
# or individually
npm run shared:build       # build shared first (dual CJS+ESM)
npm run backend:dev        # Express on http://localhost:3001
npm run frontend:dev       # Vite

# build everything
npm run build:all          # shared → backend → frontend

# deploy
npm run deploy             # frontend → GitHub Pages (gh-pages)
npm run backend:lambda     # build + bundle backend → packages/backend/dist/lambda-bundle/, then upload to Lambda
```
Requires **Node 20.19+** (Vite 7). Tests: `npm test`. Lint: `npm run lint`.

---

## 9. Config & secrets

- **Root `.env`** (backend reads it): `DATABASE_URL`, `JWT_SECRET`. Gitignored (`*.env*`).
- **Lambda env vars (prod):** set `DATABASE_URL` and `JWT_SECRET` on the function — local `.env`
  files do not ship.
- **Frontend:** `packages/frontend/.env.production` holds only `VITE_API_URL`. **Never put
  `JWT_SECRET` (or any secret) in the frontend** — the bundle is public and the repo is public.
- **Never commit password hashes.** Set them via the gitignored `*.session.sql` scratch file.
  `demo_data.sql` (fake data only) is safe to commit.
- Email feature needs sender credentials (`SENDER_EMAIL`, `SENDER_EMAIL_PASS`) as env/OS creds.

---

## 10. API endpoints

Mounted under `/api/v1` and `/:stage/api/v1`.

**Public:** `GET /health` · `POST /Login` · `POST /TriggerMonthlyReport` (cron, owner-pinned to user 1)

**Protected** (require `Authorization: Bearer`):
`GET /GetReportForMonth` · `GET /GetTrendAnalysis` · `POST /RetrieveDashboardDetails` ·
`POST /SaveReportInformation` · `POST /ProcessStatementFile` (multipart CSV) ·
`PUT /UpdateTransactionCategories` · `GET /GetCategories` · `GET /GetBudgetForMonth` ·
`POST /SaveBudget` · `GET /GetLatestBudget`

---

## 11. Decisions log (with rationale)

- **Real login over a shared-secret "demo gate"** — cleaner; the demo is a legitimate user account, not a hack.
- **Login only, no public signup, no account-creation helper** — only the owner provisions accounts; richer account mgmt deferred.
- **Demo = normal `user_id=2` with SQL-seeded fake data (Jan–May 2026)** — exercises the real API (incl. live category edit + save), fully isolated.
- **JWT (stateless) over server sessions** — no session store; fits SPA + Lambda. Trade-off: no easy pre-expiry revocation (rotating `JWT_SECRET` logs everyone out).
- **Token in `localStorage`** — simple, survives reload. Known trade-off: readable by JS (XSS exposure); a hardened setup would use httpOnly cookies + refresh tokens. Acceptable for a personal demo.
- **`bcryptjs` + `jsonwebtoken` (pure JS)** — avoid native-module Lambda bundling pain (cf. `keytar`).
- **Per-user scoping enforced server-side** (`updateTransactionCategories` and budget saves scoped to `req.userId`) — closes cross-tenant read/write holes.
- **Logout via `window` CustomEvent** — `apiClient` lives in framework-agnostic `shared`, so it can't touch React state directly; the event bus decouples them. (Callback-registration or a state store are the common alternatives if this grows.)
- **CORS handled at API Gateway (HTTP API)** — one place, applies to all routes, auto-answers OPTIONS preflight; must allow the `authorization` header.
- **CORS origin left permissive** — the gate is the token, not the origin.
- **`report_log` links to `reportanalysis` (not users directly)** with `ON DELETE SET NULL` — user is derivable; preserves audit history if the source report is deleted. PDF stored as BYTEA.
- **Atomic-design frontend + centralised `tab-shared.css`** — reduce per-feature CSS duplication; new tabs reuse the shell classes.
- **Classification reference data lives in the database, not JSON** (`category`, `merchant`, `merchant_pattern`) — merchant rules have to grow as users arrive, and a bundled JSON file meant a rebuild and redeploy to add one row. Global by design: these are the app's best-effort defaults, and a user corrects what they disagree with in the transactions tab.
- **`merchant_pattern` is read `ORDER BY LENGTH(pattern) DESC`** — matching is first-hit, and `Uber Eats` only ever beat `Uber` because it sat earlier in the JSON array. A table has no inherent order, so the length sort is what preserves that precedence. Pinned by a test.
- **`merchant.default_category` is nullable** — FNB is recognised as a merchant but has no category, and that is correct for a bank: the merchant does not determine what the transaction was for. Such merchants resolve a name and then fall through the ladder.
- **Merchant rules are loaded once at boot**, not per request — they are global and change rarely, so a rule edit needs a restart. Still strictly better than the rebuild-and-redeploy it replaced.
- **AI-assisted categorisation was built and then removed** — it was never able to make a successful call (no credits), so its quality was unknown, while it carried batching, a timeout budget, a consent flag, a demo-account block and an SDK dependency. Revisit once the DB-backed rules show how big the remaining gap actually is.

---

## 12. Outstanding / deferred

- [ ] **Email/cron route (`/TriggerMonthlyReport`) is public + owner-pinned** (always `user_id=1`).
      Deliberately left unsecured for now — owner still deciding how to protect the trigger. Only
      emails the owner their own report (low risk), but it's the one open endpoint.
- [ ] **Auth feature end-to-end runtime verification** across environments (login both accounts,
      logout/switch, 401 → login). Builds pass; prod login works after the API Gateway CORS fix.
- [ ] Active branch for the auth work: `feature/auth-demo-account` (off `main`) — merge when validated.
- [ ] Consider httpOnly-cookie token storage + short-lived tokens + refresh if this ever grows beyond personal use.
- [ ] **Transactions already stored under `Standard Bank -> Income` are still wrong.** The rule
      itself is fixed (migration `004` now seeds `NULL`, like `FNB`, and carries an `UPDATE` for
      databases that already ran the earlier version), but rows written before that keep
      `Category: Income` with `Type: Expense`. They correct themselves on re-upload of the month,
      or via the Transactions tab, which now moves the `type` with the category.
- [ ] **`Sandton City Parking` has no default category.** It previously mapped to `Parking`, which
      is not one of the 14, so it rendered as a blank dropdown; the new foreign key made that
      unrepresentable and it was seeded `NULL` rather than inventing a value. `Transport` is the
      obvious answer if you want one.
- [ ] **Corrections are still wiped when a month is re-uploaded** — `saveDashboardDetails` deletes
      and re-inserts every transaction row. Only bites on re-upload of the same month; a per-user
      override store was built for this and deliberately cut as over-engineered for the user count.
- [ ] **No UI for editing merchants, patterns or categories** — they are maintained by SQL. Worth a
      management screen if a second user starts needing their own rules.

---

## 13. Feature notes

- **Transactions tab** (`organisms/transactionsTab`) — lists a month's transactions grouped by
  category with per-row category dropdowns; tracks pending edits in a `Map<transactionId, category>`;
  Save bulk-updates via `PUT /UpdateTransactionCategories`, Reset clears pending. Needs the
  transaction `id`, which flows through `ITransaction.id` and `convertReport()`. The dropdown
  options come from `GET /GetCategories`. A correction also rewrites the row's `type` (Income /
  Savings / Expense, derived from the new category) and recomputes the stored report totals, because
  the KPI tiles sum by `type` while the breakdown groups by `category`. A correction is written to
  that transaction row only — it is not remembered, so re-uploading the month discards it.
- **Budgets** (`organisms/budgetTab`) — per-category targets per month; "use previous budget" option;
  summary metrics. Persisted via `budget` + `budget_category`.
- **PDF reports** (`PdfReportBuilder` + `ChartBuilder`) — build SVG charts via a generic
  `buildChartSvg(config)` API and embed them into a pdfkit document (`svg-to-pdfkit`).
- **Email** (`ReportEmailService` + `EmailService`) — builds the PDF, sends via nodemailer, and
  writes a `report_log` row regardless of send success (audit).
```
