import { IStatementExtractionService } from "../services/IstatementExtractionService";
import { StatementExtractionService } from "../services/statementExtractionService";

describe("StatementExtractionService", () => {
    let service: IStatementExtractionService;
    let filePath = ".\\inputs\\DummyTestStatement.csv";

    beforeEach(() => {
        service = new StatementExtractionService();
    });

    describe("CanExtractDataFromCSV", () => {
        it("should extract correct data from CSV file", async () => {
            const result = await service.getStatementData(filePath);
            expect(result).toBeDefined();
            expect(result.length).toBe(44);

            //compile a list of transactions
            const transactions = await service.compileTransactionList(result);
            expect(transactions).toBeDefined();
            expect(transactions.length).toBe(43); //Minus header row
        });
    });
});