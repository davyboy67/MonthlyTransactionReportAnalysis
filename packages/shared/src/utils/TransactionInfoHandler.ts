import { ITransactionInfoHandler, MerchantRules } from "./ITransactionInfoHandler";
import { ITransaction, TransactionType } from "../models/ITransaction";

export class TransactionInfoHandler implements ITransactionInfoHandler {
  private readonly rules: MerchantRules;
  private readonly scanCategories: string[];

  constructor(rules: MerchantRules) {
    this.rules = {
      ...rules,
      patterns: [...rules.patterns].sort((a, b) => b.pattern.length - a.pattern.length),
    };
    this.scanCategories = [...new Set(rules.defaultCategories.values())].sort(
      (a, b) => b.length - a.length,
    );
  }

  resolveMerchant(description: string): string | undefined {
    const haystack = description.toLowerCase();
    for (const { pattern, merchantName } of this.rules.patterns) {
      if (haystack.includes(pattern.toLowerCase())) {
        return merchantName;
      }
    }
    return undefined;
  }

  resolveCategory(transaction: ITransaction): string {
    if (transaction.Type == "Income") {
      return "Income";
    }

    if (transaction.Merchant) {
      const category = this.rules.defaultCategories.get(transaction.Merchant);

      if (category) {
        if (category.toLowerCase() === "savings") {
          transaction.Type = TransactionType.Savings;
        }
        return category;
      }
    }

    const description = transaction.Description.toLowerCase();

    for (const category of this.scanCategories) {
      if (description.includes(category.toLowerCase())) {
        console.warn(
          `Resolved category from description for transaction "${transaction.Description}": ${category}`,
        );

        //we want to categorise savings properly
        if (category.toLowerCase() === "savings") {
          transaction.Type = TransactionType.Savings;
        }
        return category;
      }
    }

    //2nd fallback check for specific words
    switch (transaction.Description.toLowerCase()) {
      case "rent":
        return "Utilities";
    }

    return "Miscellaneous";
  }
}
