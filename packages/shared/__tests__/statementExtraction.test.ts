import { IStatementExtractionService } from "../src/services/IstatementExtractionService";
import { StatementExtractionService } from "../src/services/statementExtractionService";
import fs from "fs";

describe("StatementExtractionService (integration)", () => {
    let service: IStatementExtractionService;

    beforeEach(() => {
        service = new StatementExtractionService();
    });

    describe("CanExtractDataFromCSV", () => {
        it("should extract transactions from a CSV file using file path", async () => {
            const result = await service.extractTransactions({
                filePath: "./inputs/DummyTestStatement.csv",
            });

            expect(result.bankName).toBe("FNB");
            expect(result.transactions).toHaveLength(43);
        });

        it("should extract transactions from a CSV file using file buffer", async () => {
            const fileBuffer = fs.readFileSync("./inputs/DummyTestStatement.csv");

            const result = await service.extractTransactions({
                filePath: "",
                fileBuffer,
            });

            expect(result.bankName).toBe("FNB");
            expect(result.transactions).toHaveLength(43);
            expect(result.transactions.every((t) => t.Date instanceof Date)).toBe(true);
        });
    });
});
