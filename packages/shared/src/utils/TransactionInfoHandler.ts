import { IMerchant } from "../models/IMerchant";
import { ITransactionInfoHandler } from "./ITransactionInfoHandler";
import { ITransaction } from "../models/ITransaction";
import { ICategory } from "../models/ICategory";
import merchantsList from "../data/merchantsList.json";
import categoryList from "../data/categoryList.json";
import merchantCategoryMapping from "../data/merchantCategoryMapping.json";

export class TransactionInfoHandler implements ITransactionInfoHandler {
  merchantRules: IMerchant[] = [];
  categoryList: ICategory[] = [];
  merchantCategoryMapping: { [merchantName: string]: string } = {};

  constructor() {
    this.merchantRules = merchantsList as IMerchant[];
    this.categoryList = categoryList as ICategory[];
    this.merchantCategoryMapping = merchantCategoryMapping as { [merchantName: string]: string };
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
    if (transaction.Merchant) {
      const category = this.merchantCategoryMapping[transaction.Merchant];
      if (category) {
        return category;
      }
    }

    // Fallback: look for category keywords in description
    const description = transaction.Description.toLowerCase();
    const categories = Object.values(this.merchantCategoryMapping);

    for (const category of categories) {
      if (description.includes(category.toLowerCase())) {
        console.warn(
          `Resolved category from description for transaction "${transaction.Description}": ${category}`,
        );
        return category;
      }
    }

    //if the category still cannot be resolved, assume its entertainment
    return "Entertainment";
  }
}
