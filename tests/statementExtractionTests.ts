import { IStatementExtractionService } from "../services/IstatementExtractionService";
import { StatementExtractionService } from "../services/statementExtractionService";

describe("StatementExtractionService", () => {
    let service: IStatementExtractionService;

    beforeEach(() => {
        service = new StatementExtractionService();
    });

    describe("ShouldExtractCsvContents", () => {
        
    });

});