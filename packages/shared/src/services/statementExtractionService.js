"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatementExtractionService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils/utils");
class StatementExtractionService {
    async getCsvFile() {
        const inputsDir = path_1.default.join(__dirname, "../inputs");
        const files = await fs_1.default.readdirSync(inputsDir);
        const csvFile = files.find((file) => file.endsWith(".csv"));
        if (!csvFile) {
            throw new Error("No CSV file found in inputs folder");
        }
        return path_1.default.join(inputsDir, csvFile);
    }
    async extractCsvContents(filePath, fileBuffer) {
        let fileContent = "";
        if (fileBuffer) {
            fileContent = fileBuffer.toString("utf-8");
        }
        else {
            fileContent = await fs_1.default.readFileSync(filePath, "utf-8");
        }
        const lines = fileContent.trim().split("\n");
        const data = lines.map((line) => line.split(",").map((cell) => cell.trim()));
        return data;
    }
    async getStatementData(object) {
        let csvData = [];
        if (object?.filePath) {
            csvData = await this.extractCsvContents(object.filePath);
        }
        else if (object?.fileBuffer) {
            csvData = await this.extractCsvContents("", object.fileBuffer);
        }
        const filteredData = utils_1.utils.filterCsvData(csvData, 6);
        return filteredData;
    }
    async compileTransactionList(data) {
        if (data?.length < 1) {
            return [];
        }
        let transactions = [];
        data.slice(1).forEach(row => {
            const date = new Date(row[0]);
            date.setHours(0, 0, 0, 0);
            let transaction = {
                month: date.toLocaleString('en-US', { month: 'short' }),
                date: date,
                description: row[3],
                amount: parseFloat(row[1]),
                //we'll derive category and merchant later
                category: "",
                merchant: "",
            };
            transactions.push(transaction);
        });
        return transactions;
    }
}
exports.StatementExtractionService = StatementExtractionService;
//# sourceMappingURL=statementExtractionService.js.map