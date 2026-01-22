"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionInfoHandler = void 0;
const fs_1 = __importDefault(require("fs"));
class TransactionInfoHandler {
    constructor() {
        this.merchantRules = [];
        this.categoryList = [];
        this.merchantCategoryMapping = {};
        this.merchantRules = JSON.parse(fs_1.default.readFileSync("merchantsList.json", "utf-8"));
        this.categoryList = JSON.parse(fs_1.default.readFileSync("categoryList.json", "utf-8"));
        this.merchantCategoryMapping = JSON.parse(fs_1.default.readFileSync("merchantCategoryMapping.json", "utf-8"));
    }
    resolveMerchant(description) {
        for (const merchant of this.merchantRules) {
            for (const pattern of merchant.patterns) {
                if (description.toLowerCase().includes(pattern.toLowerCase())) {
                    return merchant.name;
                }
            }
        }
        return undefined;
    }
    resolveCategory(transaction) {
        if (transaction.merchant) {
            const category = this.merchantCategoryMapping[transaction.merchant];
            if (category) {
                return category;
            }
        }
        // Fallback: look for category keywords in description
        const description = transaction.description.toLowerCase();
        const categories = Object.values(this.merchantCategoryMapping);
        for (const category of categories) {
            if (description.includes(category.toLowerCase())) {
                console.warn(`Resolved category from description for transaction "${transaction.description}": ${category}`);
                return category;
            }
        }
        //if the category still cannot be resolved, assume its entertainment
        return "Entertainment";
    }
}
exports.TransactionInfoHandler = TransactionInfoHandler;
//# sourceMappingURL=TransactionInfoHandler.js.map