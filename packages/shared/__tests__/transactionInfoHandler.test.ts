import { TransactionInfoHandler } from "../src/utils/TransactionInfoHandler";
import { ITransaction, TransactionType } from "../src/models/ITransaction";

describe("TransactionInfoHandler", () => {
  let handler: TransactionInfoHandler;

  const makeTx = (overrides: Partial<ITransaction> = {}): ITransaction => ({
    Date: new Date(2026, 1, 10),
    Description: "",
    Amount: -100,
    Category: "",
    Merchant: "",
    Month: "2",
    Type: TransactionType.Expense,
    ...overrides,
  });

  beforeEach(() => {
    handler = new TransactionInfoHandler();
  });

  describe("resolveMerchant", () => {
    it("should match a merchant pattern within a longer description", () => {
      expect(handler.resolveMerchant("WOOLWORTHS FOOD SANDTON")).toBe("Woolworths");
    });

    it("should match case-insensitively", () => {
      expect(handler.resolveMerchant("checkers hyper randburg")).toBe("Checkers");
      expect(handler.resolveMerchant("CHECKERS HYPER RANDBURG")).toBe("Checkers");
    });

    it("should return undefined when nothing matches", () => {
      expect(handler.resolveMerchant("some unknown corner shop")).toBeUndefined();
    });

    it("should resolve a merchant with a multi-word pattern", () => {
      expect(handler.resolveMerchant("payment to allan gray pty")).toBe("Allan Gray");
    });
  });

  describe("resolveCategory", () => {
    it("should short-circuit to Income when the transaction is already typed as Income", () => {
      const tx = makeTx({ Type: TransactionType.Income, Amount: 5000, Merchant: "Checkers" });

      expect(handler.resolveCategory(tx)).toBe("Income");
    });

    it("should resolve the category from the merchant mapping", () => {
      const tx = makeTx({ Merchant: "Checkers", Description: "card purchase" });

      expect(handler.resolveCategory(tx)).toBe("Groceries");
    });

    it("should set the transaction type to Savings when the merchant maps to Savings", () => {
      const tx = makeTx({ Merchant: "Allan Gray", Description: "debit order" });

      const category = handler.resolveCategory(tx);

      expect(category).toBe("Savings");
      expect(tx.Type).toBe(TransactionType.Savings);
    });

    it("should fall back to matching a category name inside the description", () => {
      const tx = makeTx({ Merchant: "", Description: "monthly savings transfer" });

      const category = handler.resolveCategory(tx);

      expect(category).toBe("Savings");
      expect(tx.Type).toBe(TransactionType.Savings);
    });

    it("should map a 'rent' description to Utilities via the keyword fallback", () => {
      const tx = makeTx({ Merchant: "", Description: "rent" });

      expect(handler.resolveCategory(tx)).toBe("Utilities");
    });

    it("should default to Entertainment when nothing else resolves", () => {
      const tx = makeTx({ Merchant: "", Description: "zzz totally unknown payee qqq" });

      expect(handler.resolveCategory(tx)).toBe("Entertainment");
    });

    it("should prefer the merchant mapping over the description fallback", () => {
      // description mentions "transport" but the merchant maps to Groceries
      const tx = makeTx({ Merchant: "Checkers", Description: "transport reimbursement" });

      expect(handler.resolveCategory(tx)).toBe("Groceries");
    });
  });
});
