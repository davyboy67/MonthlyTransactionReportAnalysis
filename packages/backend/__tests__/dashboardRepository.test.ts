import { DataSource, Repository } from "typeorm";
import { DashboardRepository } from "../src/repositories/DashboardRepository";
import { ReportAnalysis as ReportAnalysisEntity } from "../src/entities/ReportAnalysis";
import { Transaction as TransactionEntity } from "../src/entities/Transaction";
import {
  IReportAnalysis,
  ITransaction,
  ReportNotFoundError,
  TransactionType,
} from "@transaction-report/shared";

jest.mock("typeorm", () => {
  const actualTypeORM = jest.requireActual("typeorm");
  return {
    ...actualTypeORM,
    DataSource: jest.fn().mockImplementation(() => ({
      getRepository: jest.fn(),
    })),
  };
});

describe("DashboardRepository", () => {
  let repository: DashboardRepository;
  let mockDataSource: any;
  let mockReportAnalysisRepo: any;
  let mockTransactionRepo: any;

  beforeEach(() => {
    mockReportAnalysisRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    mockTransactionRepo = {
      save: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === ReportAnalysisEntity) {
          return mockReportAnalysisRepo;
        }
        if (entity === TransactionEntity) {
          return mockTransactionRepo;
        }
      }),
    };

    repository = new DashboardRepository(mockDataSource);
    jest.clearAllMocks();
  });

  describe("getDashboardDetails", () => {
    it("should retrieve dashboard details by id", async () => {
      const mockReport = {
        id: 1,
        report_date: new Date("2024-01-01"),
        total_income: 5000,
        total_expenses: 3000,
        total_savings: 2000,
        transactions: [
          {
            id: 1,
            report_analysis_id: 1,
            date: new Date("2024-01-01"),
            description: "Test transaction",
            amount: 100,
            category: "Food",
            merchant: "Test Merchant",
            type: "Expense",
          },
        ],
      };

      mockReportAnalysisRepo.findOne.mockResolvedValue(mockReport);

      const result = await repository.getDashboardDetails(
        new Date("2024-01-01"),
        1,
      );

      expect(result).not.toBeNull();
      expect(result?.TotalIncome).toBe(5000);
      expect(result?.TotalExpenses).toBe(3000);
      expect(result?.TotalSavings).toBe(2000);
      expect(result?.CategorySummaries).toHaveLength(1);
      expect(result?.CategorySummaries[0].Merchants).toEqual(["Test Merchant"]);
      expect(mockReportAnalysisRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["transactions"],
      });
    });

    it("should retrieve dashboard details by date", async () => {
      const mockReport = {
        id: 1,
        report_date: new Date("2024-01-01"),
        total_income: 5000,
        total_expenses: 3000,
        total_savings: 2000,
        transactions: [],
      };

      mockReportAnalysisRepo.find.mockResolvedValue([mockReport]);

      const result = await repository.getDashboardDetails(
        new Date("2024-01-01"),
      );

      expect(result).not.toBeNull();
      expect(result?.CategorySummaries).toHaveLength(0);
      expect(mockReportAnalysisRepo.find).toHaveBeenCalled();
    });

    it("should return ReportNotFoundError when no report is found by date", async () => {
      mockReportAnalysisRepo.find.mockResolvedValue([]);

      await expect(
        repository.getDashboardDetails(new Date("2024-01-01")),
      ).rejects.toThrow(ReportNotFoundError);
    });

    it("should retrieve most recent report when called with no arguments", async () => {
      const mockReport = {
        id: 2,
        report_date: new Date("2024-02-01"),
        total_income: 6000,
        total_expenses: 4000,
        total_savings: 2000,
        transactions: [],
      };

      mockReportAnalysisRepo.find.mockResolvedValue([mockReport]);

      const result = await repository.getDashboardDetails();

      expect(result).not.toBeNull();
      expect(result?.TotalIncome).toBe(6000);
      expect(mockReportAnalysisRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { report_date: "DESC" }, take: 1 }),
      );
    });

    it("should throw ReportNotFoundError when no report is found by id", async () => {
      mockReportAnalysisRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.getDashboardDetails(new Date("2024-01-01"), 1),
      ).rejects.toThrow(ReportNotFoundError);
    });
  });

  describe("saveDashboardDetails", () => {
    it("should save dashboard details with transactions", async () => {
      const reportAnalysis: IReportAnalysis = {
        Date: new Date("2024-01-01"),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        TotalSavings: 2000,
        CategorySummaries: [
          {
            CategoryName: "Food",
            TotalAmount: 100,
            Transactions: [
              {
                Date: new Date("2024-01-01"),
                Description: "Test",
                Amount: 100,
                Category: "Food",
                Merchant: "Test Merchant",
                Month: "1",
                Type: TransactionType.Expense,
              },
            ],
          },
        ],
      };

      const mockCreatedReport = {
        id: 1,
        report_date: new Date("2024-01-01"),
        total_income: 5000,
        total_expenses: 3000,
        total_savings: 2000,
      };

      mockReportAnalysisRepo.save.mockResolvedValue(mockCreatedReport);
      mockTransactionRepo.save.mockResolvedValue({});

      await repository.saveDashboardDetails(reportAnalysis);

      expect(mockReportAnalysisRepo.save).toHaveBeenCalledTimes(1);
      expect(mockReportAnalysisRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_income: 5000,
          total_expenses: 3000,
          total_savings: 2000,
        }),
      );
      expect(mockTransactionRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
