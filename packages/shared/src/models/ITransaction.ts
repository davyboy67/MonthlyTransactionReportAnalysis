
export interface ITransaction {
  id?: number;
  Month: string;
  Date: Date;
  Description: string;
  Amount: number;
  Category: string;
  Merchant?: string;
  Type: TransactionType;
}

export enum TransactionType {
  Income = "Income",
  Expense = "Expense",
  Savings = "Savings"
}