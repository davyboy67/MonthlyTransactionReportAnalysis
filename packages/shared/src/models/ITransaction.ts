
export interface ITransaction {
  Month: string;
  Date: Date;
  Description: string;
  Amount: number;
  Category: string;
  Merchant?: string;
}