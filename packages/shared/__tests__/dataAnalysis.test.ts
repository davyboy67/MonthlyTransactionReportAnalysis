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

    // this test is failing because you cant use the nodejs function .fs in a testing environment
    it("should create a report analysis with 5 transactions", async () => {
        // Sample transactions from TestStatement.csv
        const transactions: ITransaction[] = [
            {
                Month: "1",
                Date: new Date("2025/12/24"),
                Description: "CAPITEC   K CAMANE",
                Amount: 740.00,
                Category: "",
                Merchant: ""
            },
            {
                Month: "2",
                Date: new Date("2025/12/23"),
                Description: "PURCH CheckersHyper Sandt 400738******0878",
                Amount: -491.53,
                Category: "",
                Merchant: ""
            },
            {
                Month: "3",
                Date: new Date("2025/12/23"),
                Description: "New Uber Eats 412752*0365  19 DEC",
                Amount: -279.00,
                Category: "",
                Merchant: ""
            },
            {
                Month: "4",
                Date: new Date("2025/12/22"),
                Description: "PURCH Takealot 400738******0878",
                Amount: -582.00,
                Category: "",
                Merchant: ""
            },
            {
                Month: "5",
                Date: new Date("2025/12/22"),
                Description: "PURCH CLICKS SANDTON CITY 400738******0878",
                Amount: -296.15,
                Category: "",
                Merchant: ""
            },
            {
                Month: "6",
                Date: new Date("2025/12/22"),
                Description: "PURCH Electricity 400738******0878",
                Amount: -300.00,
                Category: "",
                Merchant: ""
            },
            {
                Month: "7",
                Date: new Date("2025/12/20"),
                Description: "Unkown vendor 400738******0878",
                Amount: -100.00,
                Category: "",
                Merchant: ""
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