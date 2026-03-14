import { IStatementExtractionService } from "../src/services/IstatementExtractionService";
import { StatementDataObject, StatementExtractionService } from "../src/services/statementExtractionService";
import fs from "fs";

describe("StatementExtractionService", () => {
    let service: IStatementExtractionService;


    beforeEach(() => {
        service = new StatementExtractionService();
    });

    describe("CanExtractDataFromCSV", () => {
        it("should extract correct data from CSV file using file path", async () => {
            const statementDataObject = {} as StatementDataObject;
            statementDataObject.filePath = "./inputs/DummyTestStatement.csv";
            const result = await service.getStatementData(statementDataObject);
            expect(result).toBeDefined();
            expect(result.length).toBe(44);

            //compile a list of transactions
            const transactions = await service.compileTransactionList(result);
            expect(transactions).toBeDefined();
            expect(transactions.length).toBe(43); //Minus header row
        });

        it("should extract correct data from CSV file using file buffer", async () => {
            const fileBuffer = fs.readFileSync("./inputs/DummyTestStatement.csv");
            const statementDataObject = {} as StatementDataObject;
            statementDataObject.fileBuffer = fileBuffer;
            
            const result = await service.getStatementData(statementDataObject);
            expect(result).toBeDefined();
            expect(result.length).toBe(44);

            //compile a list of transactions
            const transactions = await service.compileTransactionList(result);
            expect(transactions).toBeDefined();
            expect(transactions.length).toBe(43); //Minus header row
        });
    });
});