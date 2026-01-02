import { IMerchant } from "../models/IMerchant";
import fs from "fs";
import { ITransactionInfoHandler } from "./ITransactionInfoHandler";
import { ITransaction } from "../models/ITransaction";
import { ICategory } from "../models/ICategory";

export class TransactionInfoHandler implements ITransactionInfoHandler {
    merchantRules: IMerchant[] = [];
    categoryList: ICategory[] = [];
    merchantCategoryMapping: { [merchantName: string]: string } = {};

    constructor() {
        this.merchantRules = JSON.parse(fs.readFileSync("merchantsList.json", "utf-8"));
        this.categoryList = JSON.parse(fs.readFileSync("categoryList.json", "utf-8"));
        this.merchantCategoryMapping = JSON.parse(fs.readFileSync("merchantCategoryMapping.json", "utf-8"));
    }


    resolveMerchant(description: string): string | undefined {
        for (const merchant of this.merchantRules) {
            for (const pattern of merchant.patterns) {
                if (description.toLowerCase().includes(pattern.toLowerCase())) {
                    return merchant.name;
                }
            }
        }
        return undefined;
    }

    resolveCategory(transaction: ITransaction): string {
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