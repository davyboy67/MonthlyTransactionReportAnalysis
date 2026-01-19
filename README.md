# Monthly Transaction Report Analysis

A comprehensive transaction analysis application that extracts, processes, and analyzes monthly financial transactions with automated categorization and reporting.

## Overview

This application provides:
- **Transaction Extraction**: Parse CSV bank statements
- **Automated Categorization**: Intelligent merchant-based categorization
- **Data Analysis**: Generate category summaries and spending insights
- **Dashboard API**: Store and retrieve transaction reports
- **Frontend Dashboard**: Visualize transaction data (React-based)

## Technology Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** - REST API framework
- **Prisma ORM** - Database toolkit for PostgreSQL
- **PostgreSQL** (Neon) - Database

### Frontend
- **React** with **TypeScript**
- **Vite** - Build tool
- Dashboard visualizations

### Testing
- **Jest** - Unit testing framework
- **Supertest** - API testing

## Project Structure

```
.
├── backend/              # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── models/
│   │   └── server.ts
│   └── README.md
├── dashboard/            # React frontend application
├── services/             # Transaction processing services
│   ├── statementExtractionService.ts
│   ├── dataAnalysisService.ts
│   └── apiClient.ts
├── models/               # TypeScript interfaces
├── utils/                # Utility functions
├── tests/                # Test suites
├── prisma/               # Database schema and migrations
└── inputs/               # CSV input files
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

4. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

### Running the Application

#### Backend API Server
```bash
# Development mode
npm run backend:dev

# Production build
npm run backend:build
npm run backend:start
```

The API server will start on `http://localhost:3001` (or the PORT specified in `.env`).

#### Frontend Dashboard
```bash
cd dashboard/dashboard
npm install
npm run dev
```

### Running Tests
```bash
# Run all tests
npm test

# Run backend tests only
npm test -- dashboardRepository.test.ts dashboardService.test.ts dashboardRoutes.test.ts
```

## API Documentation

See [backend/README.md](backend/README.md) for detailed API documentation.

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
- `prisma/schema.prisma` - Database schema definition
- `prisma.config.ts` - Prisma configuration
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Test configuration

## Development

### Adding New Categories
Edit `categoryList.json` to add new transaction categories.

### Adding Merchant Mappings
Edit `merchantCategoryMapping.json` to map merchants to categories.

### Running Linters
Currently, no linter is configured. To add ESLint:
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npx eslint --init
```

## Migration Notes

This project was recently migrated from a dual-backend architecture (.NET + Node.js) to a unified Node.js backend. See [MIGRATION.md](MIGRATION.md) for details.

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` in `.env`
- Ensure database is accessible from your network
- Check that required tables exist

### Prisma Issues
- Regenerate client: `npm run prisma:generate`
- Check schema: `npx prisma validate`
- View database: `npx prisma studio`

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
