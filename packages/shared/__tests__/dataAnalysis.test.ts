import { DataAnalysisService } from "../src/services/dataAnalysisService";
import { IDataAnalysisService } from "../src/services/IDataAnalysisService";
import { ITransaction } from "../src/models/ITransaction";
import { ITransactionInfoHandler } from "../src/utils/ITransactionInfoHandler";
import { TransactionInfoHandler } from "../src/utils/TransactionInfoHandler";
import { apiClient } from "../src/services/apiClient";

jest.mock("../src/services/apiClient", () => ({
    apiClient: {
      saveReportAnalysis: jest.fn(),
    },
  }));

describe("CanCreateAnalysisFromData", () => {
let dataAnalysisService: IDataAnalysisService;
let transactionInfoHandler: ITransactionInfoHandler;

    beforeEach(() => {
        transactionInfoHandler = new TransactionInfoHandler();
        dataAnalysisService = new DataAnalysisService(transactionInfoHandler);
    });


    it("should return analysis object from data", async () => {
        
    });

    it("should create a report analysis with 5 transactions", async () => {
        // Sample transactions from TestStatement.csv
        const transactions: ITransaction[] = [
            {
                month: "1",
                date: new Date("2025/12/24"),
                description: "CAPITEC   K CAMANE",
                amount: 740.00,
                category: "",
                merchant: ""
            },
            {
                month: "2",
                date: new Date("2025/12/23"),
                description: "PURCH CheckersHyper Sandt 400738******0878",
                amount: -491.53,
                category: "",
                merchant: ""
            },
            {
                month: "3",
                date: new Date("2025/12/23"),
                description: "New Uber Eats 412752*0365  19 DEC",
                amount: -279.00,
                category: "",
                merchant: ""
            },
            {
                month: "4",
                date: new Date("2025/12/22"),
                description: "PURCH Takealot 400738******0878",
                amount: -582.00,
                category: "",
                merchant: ""
            },
            {
                month: "5",
                date: new Date("2025/12/22"),
                description: "PURCH CLICKS SANDTON CITY 400738******0878",
                amount: -296.15,
                category: "",
                merchant: ""
            },
            {
                month: "6",
                date: new Date("2025/12/22"),
                description: "PURCH Electricity 400738******0878",
                amount: -300.00,
                category: "",
                merchant: ""
            },
            {
                month: "7",
                date: new Date("2025/12/20"),
                description: "Unkown vendor 400738******0878",
                amount: -100.00,
                category: "",
                merchant: ""
            }
        ];

        const report = await dataAnalysisService.analyseTransactions(transactions);

        expect(report).toBeDefined();
        expect(report.Date).toBeDefined();
        expect(report.TotalIncome).toBe(740.00);
        expect(report.TotalExpenses).toBe(-2048.68);
        expect(apiClient.saveReportAnalysis).toHaveBeenCalledWith(report);
    });

});