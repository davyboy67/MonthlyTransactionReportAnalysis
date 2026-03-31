# Monthly Transaction Report Analysis

A comprehensive transaction analysis application that extracts, processes, and analyzes monthly financial transactions with automated categorization and reporting. The backend is deployed as a single AWS Lambda function.

## Overview

This application provides:
- **Transaction Extraction**: Parse CSV bank statements
- **Automated Categorization**: Intelligent merchant-based categorization
- **Data Analysis**: Generate category summaries and spending insights
- **Dashboard API**: Store and retrieve transaction reports via a unified Lambda function
- **Frontend Dashboard**: Visualize transaction data (React-based)

## Technology Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** - REST API framework
- **TypeORM** - TypeScript ORM for PostgreSQL
- **PostgreSQL** (Neon) - Database
- **AWS Lambda** - Serverless deployment
- **@vendia/serverless-express** - Express in Lambda adapter

### Frontend
- **React** with **TypeScript**
- **Vite** - Build tool
- **Recharts** - Dashboard visualizations

### Shared
- **TypeScript** - Shared interfaces and services

### Testing
- **Jest** - Unit testing framework
- **Supertest** - API testing

## Project Structure

```
.
├── docs/                     # Deployment guides and checklists
├── packages/
│   ├── backend/              # Node.js/Express API server (also runs in Lambda)
│   │   ├── src/
│   │   │   ├── lambda.ts     # Lambda handler entry point
│   │   │   └── server.ts     # Local Express server entry point
│   │   ├── __tests__/
│   │   └── package.json
│   ├── frontend/             # React frontend application
│   │   ├── src/
│   │   └── package.json
│   └── shared/               # Shared code (interfaces, services)
│       ├── src/
│       └── __tests__/
├── scripts/
│   └── bundle-lambda.js      # Packages backend for Lambda deployment
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm
- PostgreSQL database (Neon recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/davyboy67/MonthlyTransactionReportAnalysis.git
   cd MonthlyTransactionReportAnalysis
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your database connection string
   ```

## Deployment

### Local Development
```bash
npm run backend:dev  # Express server on localhost:3001
```

### Production Deployment

The backend is deployed to AWS Lambda as a single function handling all routes using `@vendia/serverless-express`.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

**Quick deploy:**
```bash
npm run backend:lambda  # Build Lambda package
# Then upload packages/backend/dist/lambda-bundle/ to AWS Lambda
```

## Running the Application

### Development Mode (All packages)
```bash
# Run backend, frontend, and shared packages concurrently
npm run dev
```

### Individual Packages

<details>
<summary>Backend API Server</summary>

```bash
# Development mode (local Express server)
npm run backend:dev

# Production build
npm run backend:build
npm run backend:start

# Build Lambda package for deployment
npm run backend:lambda
```
The API server will start on `http://localhost:3001` (or the PORT specified in `.env`).

</details>

<details>
<summary>Frontend Dashboard</summary>

```bash
# Development mode
npm run frontend:dev
```

</details>


### Running Tests
```bash
# Run all tests
npm test
```

## API Documentation

See [packages/backend/README.md](packages/backend/README.md) for detailed API documentation.

The API is served by a single Lambda function. All routes are available at the same function URL.

### Available Endpoints

- **GET** `/health` - Health check
- **POST** `/api/v1/RetrieveDashboardDetails` - Get report by date or ID
- **POST** `/api/v1/SaveReportInformation` - Save report to database

## Database Schema

### Tables

**reportanalysis**
- `id` (Primary Key)
- `report_date`
- `total_income`
- `total_expenses`

**transaction**
- `id` (Primary Key)
- `report_analysis_id` (Foreign Key)
- `date`
- `description`
- `amount`
- `category`
- `merchant`

## Features

### Transaction Processing
- CSV file parsing and extraction
- Automatic merchant recognition
- Category assignment based on merchant
- Date normalization and validation

### Data Analysis
- Category-wise spending summaries
- Merchant tracking per category
- Income vs. expenses calculation
- Monthly breakdowns

### API & Storage
- PostgreSQL database persistence
- RESTful API for report retrieval
- Bulk transaction saving
- Query by date or report ID

## Configuration Files

- `.env` - Environment variables (DATABASE_URL, PORT)
- `packages/backend/src/entities/` - TypeORM entity definitions
- `packages/backend/src/database/dataSource.ts` - TypeORM configuration
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Test configuration

## Development

### Adding New Categories
Edit `packages/shared/src/data/categoryList.json` to add new transaction categories.

### Adding Merchant Mappings
Edit `packages/shared/src/data/merchantCategoryMapping.json` to map merchants to categories.

### Running Linters
```bash
npm run lint
```

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` in `.env`
- Ensure database is accessible from your network
- Check that required tables exist

### TypeORM Issues
- Check entities: Verify entity decorators in `packages/backend/src/entities/`
- Run migrations: `npx typeorm migration:run`
- Check connection: Verify `DATABASE_URL` in `.env`

### Port Conflicts
- Change `PORT` in `.env` file
- Default is 3001 for backend

## Contributing

This is a personal project, but suggestions and improvements are welcome.

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

This is a personal project. All rights reserved.

## Contact

For questions or support, please open an issue on GitHub.