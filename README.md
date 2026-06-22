# Monthly Transaction Report Analysis

A personal monthly **financial report** web app. Upload a bank statement (CSV) and it is
parsed, categorised, and turned into a report — income / expenses / savings with a
per-category breakdown — then visualised on a dashboard with budgets, trend analysis, an
editable transactions view, PDF reports, and an optional monthly email. Currency context
is ZAR. The app is multi-user behind a login, and ships with a public **demo account**.

The backend runs as a single AWS Lambda function (Express via `@vendia/serverless-express`);
the frontend is a static React/Vite SPA deployed to GitHub Pages.

## Features

- **Statement processing** — CSV parsing, merchant recognition, automatic category assignment, date normalisation.
- **Dashboard** — monthly overview (income/expenses/savings) and per-category breakdown with charts.
- **Budgets** — set per-category budget targets per month and compare against actuals.
- **Trend analysis** — spending trends across recent months.
- **Transactions tab** — list a month's transactions grouped by category and re-categorise them (bulk save).
- **PDF reports** — server-generated PDF of a monthly report.
- **Monthly email** — scheduled email of the monthly report (triggered via a cron endpoint).
- **Report logging** — every generated report is audited in a `report_log` table.
- **Authentication** — username/password login (JWT), multi-user data isolation, plus a seeded demo account.

## Technology stack

**Backend** — Node.js + TypeScript · Express 5 · TypeORM · PostgreSQL (Neon) · AWS Lambda + API Gateway (HTTP API) · `@vendia/serverless-express` · `jsonwebtoken` + `bcryptjs` (auth) · `pdfkit` (reports) · `nodemailer` (email)

**Frontend** — React 19 + TypeScript · Vite · Recharts · deployed to GitHub Pages via `gh-pages`

**Shared** — a TypeScript library (dual CJS + ESM build) holding shared types, the `apiClient`, and the parsing/analysis services used by both ends.

**Testing / tooling** — Jest · Supertest · ESLint

## Project structure

```
.
├── packages/
│   ├── backend/                      # Express API (also runs in Lambda)
│   │   └── src/
│   │       ├── lambda.ts             # Lambda handler entry
│   │       ├── server.ts             # Local server entry
│   │       ├── app.ts                # Express app + route mounting + middleware
│   │       ├── routes/               # auth, dashboard, budget, email routes
│   │       ├── services/             # AuthService, DashboardService, PdfReportBuilder, EmailService, ...
│   │       ├── repositories/         # TypeORM data access
│   │       ├── middleware/           # authenticate (JWT gate)
│   │       ├── entities/             # TypeORM entities
│   │       └── database/
│   │           ├── migrations/       # manual SQL migrations
│   │           └── seeds/            # demo_data.sql (demo account data)
│   ├── frontend/                     # React + Vite SPA
│   │   └── src/
│   │       ├── App.tsx               # auth gate (login vs dashboard)
│   │       └── components/pages/     # login, dashboard, ...
│   └── shared/                       # shared types, apiClient, parsing/analysis (dual CJS+ESM build)
├── scripts/
│   └── bundle-lambda.js              # packages backend for Lambda deployment
├── package.json                      # npm-workspaces root
├── CLAUDE.md                         # agent/onboarding guidance
└── README.md
```

## Getting started

### Prerequisites
- **Node.js 20.19+** (or 22.12+) — required by Vite 7
- npm
- A PostgreSQL database (Neon recommended)

### Install
```bash
git clone https://github.com/davyboy67/MonthlyTransactionReportAnalysis.git
cd MonthlyTransactionReportAnalysis
npm install
```

### Configure environment
The backend reads the **root `.env`**. Required variables:
```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=<a long random string>     # used to sign/verify auth tokens; server-only, never commit
```
Generate a secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`

The frontend reads `packages/frontend/.env.production` for `VITE_API_URL` (the deployed API URL).
Only `VITE_*` vars belong there — **never put `JWT_SECRET` in the frontend.**

> The email feature additionally needs sender credentials (`SENDER_EMAIL`, `SENDER_EMAIL_PASS`)
> as env vars / OS credentials; optional unless you use the monthly email.

### Database setup
The DB runs with TypeORM `synchronize: false`, so schema changes are **manual SQL migrations**:
```bash
# apply the migrations in packages/backend/src/database/migrations/ to your database, e.g.
#   001_create_report_log.sql
#   002_add_user_password.sql
```
To set up accounts: hash a password with
`node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"`, then `UPDATE users SET
password_hash=...` for your account. To populate the demo account, run
`packages/backend/src/database/seeds/demo_data.sql`.

## Running locally

```bash
npm run dev            # shared (watch) + backend + frontend concurrently
```
Or individually:
```bash
npm run shared:build   # build shared first (dual CJS+ESM) — required after editing shared
npm run backend:dev    # Express on http://localhost:3001
npm run frontend:dev   # Vite dev server
```

> **Note:** after editing `packages/shared`, run `npm run shared:build` (it builds both CJS and
> ESM). `tsc -b` alone is not enough and the frontend won't pick up changes.

## Authentication & accounts

- Login (`POST /api/v1/Login`) verifies email + bcrypt-hashed password and returns a **JWT**
  (`{ userId }`, 7-day expiry) signed with `JWT_SECRET`.
- The frontend stores the token (localStorage + memory) and an axios interceptor attaches it as
  `Authorization: Bearer <token>` on every request. The `authenticate` middleware verifies it and
  sets `req.userId`; all data queries are scoped per user. Identity is server-authoritative.
- **Demo account:** email `admin`, password `admin` — a normal user (`user_id = 2`) populated with
  fake data (`demo_data.sql`), isolated from real data. Use it to explore the app.

## Deployment

### Frontend (GitHub Pages)
```bash
npm run deploy         # builds frontend and publishes dist/ via gh-pages
```

### Backend (AWS Lambda)
```bash
npm run backend:lambda # builds + bundles to packages/backend/dist/lambda-bundle/
# then upload the bundle to the Lambda function
```
On the Lambda, set the environment variables **`DATABASE_URL`** and **`JWT_SECRET`**.

### API Gateway (CORS)
The API is fronted by an API Gateway **HTTP API**. Because every authenticated request carries an
`Authorization` header, browsers send a CORS **preflight** (`OPTIONS`) before each call. Configure
CORS on the API so the preflight succeeds:
- **Allow-Origin:** your frontend origin (e.g. `https://davyboy67.github.io`)
- **Allow-Headers:** `content-type`, `authorization`
- **Allow-Methods:** `GET, POST, PUT, DELETE, OPTIONS`

## API endpoints

Routes are mounted under `/api/v1` (local) and `/:stage/api/v1` (API Gateway stage path).

**Public**
- `GET  /health` — health check
- `POST /api/v1/Login` — authenticate, returns a JWT
- `POST /api/v1/TriggerMonthlyReport` — generate + email the monthly report (cron-triggered, owner-pinned)

**Protected** (require `Authorization: Bearer <token>`)
- `GET  /api/v1/GetReportForMonth?month=&year=` — report for a month
- `GET  /api/v1/GetTrendAnalysis?months=` — recent months for trend analysis
- `POST /api/v1/RetrieveDashboardDetails` — report by date or id
- `POST /api/v1/SaveReportInformation` — persist a report
- `POST /api/v1/ProcessStatementFile` — upload + parse a CSV statement
- `PUT  /api/v1/UpdateTransactionCategories` — bulk re-categorise transactions
- `GET  /api/v1/GetBudgetForMonth?month=&year=` — budget for a month
- `POST /api/v1/SaveBudget` — create/update a budget
- `GET  /api/v1/GetLatestBudget` — most recent budget

## Database schema (key tables)

**users** — `user_id` (PK), `first_name`, `last_name`, `email`, `password_hash`

**reportanalysis** — `id` (PK), `user_id` (FK), `report_date`, `total_income`, `total_expenses`, `total_savings`, `budget_id` (FK, nullable)

**transaction** — `id` (PK), `report_analysis_id` (FK), `user_id` (FK), `date`, `description`, `amount`, `category`, `merchant`, `type`

**budget** — `budget_id` (PK), `user_id` (FK), `budget_month`, `notes`, `created_at`, `updated_at`

**budget_category** — `category_id` (PK), `budget_id` (FK), `category_name`, `amount`

**report_log** — `id` (PK), `report_analysis_id` (FK, nullable), `generated_at`, `email_sent`, `email_sent_at`, `pdf_data`

## Development notes

- **Categories:** edit `packages/shared/src/data/categoryList.json`.
- **Merchant mappings:** edit `packages/shared/src/data/merchantCategoryMapping.json`.
- **Tests:** `npm test` · **Lint:** `npm run lint`
- **Agent context:** `CLAUDE.md` (auto-loaded) summarises architecture and conventions for AI agents.

## Troubleshooting

- **Login fails with a CORS / OPTIONS 404 in prod** — configure CORS on the API Gateway HTTP API (see Deployment); the `OPTIONS` preflight must allow the `authorization` header.
- **401 on every request** — `JWT_SECRET` not set on the backend/Lambda, or the token expired (re-login).
- **Frontend doesn't see new shared code** — rebuild shared with `npm run shared:build` (dual CJS+ESM).
- **DB errors** — verify `DATABASE_URL`, that the database is reachable, and that the migrations have been applied.

## License

Personal project. All rights reserved.
