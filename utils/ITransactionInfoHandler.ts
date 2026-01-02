import { ITransaction } from "../models/ITransaction";

export interface ITransactionInfoHandler {
    resolveMerchant(description: string): string | undefined;
    resolveCategory(transaction: ITransaction): string
}