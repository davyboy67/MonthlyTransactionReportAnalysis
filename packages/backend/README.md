# Backend API

This is the Node.js/TypeScript backend for the Monthly Transaction Report Analysis application. It runs as an Express server locally and deploys to AWS Lambda as a single unified function using `@vendia/serverless-express`.

## Technology Stack

- **Node.js** with **TypeScript**
- **Express.js** - Web framework
- **TypeORM** - TypeScript ORM for PostgreSQL
- **PostgreSQL** - Database (hosted on Neon)
- **@vendia/serverless-express** - Runs Express app inside AWS Lambda
- **Jest** - Testing framework

## Dual-Mode Architecture

The backend supports two execution modes from the same codebase:

| Mode | Entry Point | How to Run |
|------|------------|------------|
| Local development | `src/server.ts` | `npm run backend:dev` |
| AWS Lambda | `src/lambda.ts` | `npm run backend:lambda` then upload bundle |

`src/app.ts` creates and configures the Express application. Both entry points use this shared app, so local and Lambda behaviour is identical.

`@vendia/serverless-express` wraps the Express app in a Lambda handler. When Lambda receives an HTTP event (from a Function URL or API Gateway), it translates it into an Express request and returns the Express response to AWS.

## Prerequisites

- Node.js (v18 or higher)
- npm
- PostgreSQL database (Neon or local)

## Setup

1. **Install dependencies** (from root directory):
   ```bash
   npm install
   ```

2. **Configure database connection**:
   - Copy the `.env.example` file to `.env` (if not exists)
   - Update the `DATABASE_URL` with your PostgreSQL connection string:
     ```
     DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
     ```

3. **Database Schema**:
   The application expects the following tables in your PostgreSQL database:
   
   - `reportanalysis` - Stores report summaries
   - `transaction` - Stores individual transactions
   
   See entity definitions in `backend/src/entities/` for the complete schema.

## Running the Backend

### Local Development (Express server)
```bash
npm run backend:dev
```
Starts the server with `ts-node` on port 3001 (or the PORT specified in `.env`).

### Production Build (Lambda deployment)
```bash
npm run backend:lambda
```
Compiles TypeScript and creates a bundled Lambda package at `packages/backend/dist/lambda-bundle/`. See [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) for full deployment instructions.

### Build Only
```bash
npm run backend:build
npm run backend:start
```

## API Endpoints

### Health Check
- **GET** `/health`
  - Returns server status

### Retrieve Dashboard Details
- **POST** `/api/v1/RetrieveDashboardDetails`
  - Request body:
    ```json
    {
      "Date": "2024-01-01T00:00:00.000Z",
      "id": null
    }
    ```
  - Response:
    ```json
    {
      "ReportAnalysis": {
        "Date": "2024-01-01T00:00:00.000Z",
        "TotalIncome": 5000.00,
        "TotalExpenses": 3000.00,
        "CategorySummaries": [...]
      }
    }
    ```

### Save Report Information
- **POST** `/api/v1/SaveReportInformation`
  - Request body:
    ```json
    {
      "ReportAnalysis": {
        "Date": "2024-01-01T00:00:00.000Z",
        "TotalIncome": 5000.00,
        "TotalExpenses": 3000.00,
        "CategorySummaries": [...]
      }
    }
    ```
  - Response: 200 OK (empty body)

## Project Structure

```
backend/
├── src/
│   ├── app.ts            # Express app factory (shared by server and Lambda)
│   ├── server.ts         # Local Express server entry point
│   ├── lambda.ts         # AWS Lambda handler entry point
│   ├── services/         # Business logic layer
│   │   └── DashboardService.ts
│   ├── repositories/     # Data access layer
│   │   └── DashboardRepository.ts
│   ├── routes/           # API route definitions
│   │   └── dashboardRoutes.ts
│   ├── models/           # TypeScript type definitions
│   │   └── types.ts
│   ├── entities/         # TypeORM entity definitions
│   └── database/         # TypeORM DataSource configuration
├── dist/                 # Compiled JavaScript (generated)
└── tsconfig.json         # TypeScript configuration
```

## Testing

Run backend tests:
```bash
npm test -- dashboardRepository.test.ts dashboardService.test.ts dashboardRoutes.test.ts
```

Or run all tests:
```bash
npm test
```

## CORS Configuration

The backend is configured to allow all origins for development. Update the CORS configuration in `src/app.ts` for production use.

## Database Connection

The application uses TypeORM to interact with PostgreSQL. Connection configuration is managed through:
- `backend/src/entities/` - Entity definitions
- `backend/src/database/dataSource.ts` - TypeORM DataSource configuration
- `.env` - Database connection string

## Environment Variables

Required environment variables:

```env
# Database connection string
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Server port (optional, defaults to 3001 — local development only)
PORT=3001

# NODE_ENV (set to "production" in Lambda environment variables)
NODE_ENV=development
```

## Troubleshooting

### TypeORM connection errors
- Verify your `DATABASE_URL` is correct in `.env`
- Ensure your database is accessible from your network
- Check that the database tables exist
- Verify entity decorators are properly configured in `backend/src/entities/`

### Entity synchronization issues
- Check `synchronize` setting in `backend/src/database/dataSource.ts`
- Run migrations if needed: `npx typeorm migration:run`

### TypeScript compilation errors
- Run `npm run backend:build` to see detailed errors
- Make sure all dependencies are installed: `npm install`
