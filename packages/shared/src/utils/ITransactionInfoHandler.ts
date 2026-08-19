import { ITransaction } from "../models/ITransaction";

export interface MerchantPatternRule {
    pattern: string;
    merchantName: string;
}

/** Matching is first-hit, so "uber eats" has to beat "uber": the handler sorts `patterns` longest-first. */
export interface MerchantRules {
    patterns: MerchantPatternRule[];
    defaultCategories: Map<string, string>;
}

export interface ITransactionInfoHandler {
    resolveMerchant(description: string): string | undefined;
    resolveCategory(transaction: ITransaction): string
}
