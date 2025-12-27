import { IStatementExtractionService } from "../services/IstatementExtractionService";
import { StatementExtractionService } from "../services/statementExtractionService";

describe("StatementExtractionService", () => {
    let service: IStatementExtractionService;
    let filePath = ".\\inputs\\DummyTestStatement.csv";

    beforeEach(() => {
        service = new StatementExtractionService();
    });

    describe("ShouldExtractCorrectDataFromCsv", () => {
        it("should extract correct data from CSV file", async () => {
            const result = await service.getInformationFromStatement(filePath);
            expect(result).toBeDefined();
            expect(result.length).toBe(44);
        });
    });
});