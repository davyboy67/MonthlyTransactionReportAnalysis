import { IMerchant } from "../models/IMerchant";
import { ITransactionInfoHandler } from "./ITransactionInfoHandler";
import { ITransaction } from "../models/ITransaction";
import { ICategory } from "../models/ICategory";
export declare class TransactionInfoHandler implements ITransactionInfoHandler {
    merchantRules: IMerchant[];
    categoryList: ICategory[];
    merchantCategoryMapping: {
        [merchantName: string]: string;
    };
    constructor();
    resolveMerchant(description: string): string | undefined;
    resolveCategory(transaction: ITransaction): string;
}
//# sourceMappingURL=TransactionInfoHandler.d.ts.map