import { getIncomeSources, getTopCategories } from "../src/utils/transactionAnalysis";
import { ICategorySummary, ITransaction, TransactionType } from "@transaction-report/shared";

const makeTransaction = (overrides: Partial<ITransaction> = {}): ITransaction => ({
  Date: new Date(2026, 6, 1),
  Description: "Test transaction",
  Amount: 100,
  Category: "",
  Merchant: "",
  Month: "7",
  Type: TransactionType.Income,
  ...overrides,
});

const makeSummary = (
  categoryName: string,
  totalAmount: number,
  transactions: ITransaction[],
): ICategorySummary => ({
  CategoryName: categoryName,
  TotalAmount: totalAmount,
  Transactions: transactions,
});

describe("getIncomeSources", () => {
  it("returns an empty array when there is no Income category", () => {
    const summaries = [makeSummary("Groceries", 50, [makeTransaction({ Amount: -50 })])];

    expect(getIncomeSources(summaries)).toEqual([]);
  });

  it("groups income transactions by merchant", () => {
    const summaries = [
      makeSummary("Income", 1500, [
        makeTransaction({ Merchant: "Employer", Amount: 1000 }),
        makeTransaction({ Merchant: "Employer", Amount: 500 }),
      ]),
    ];

    const sources = getIncomeSources(summaries);

    expect(sources).toHaveLength(1);
    expect(sources[0].name).toBe("Employer");
    expect(sources[0].totalAmount).toBe(1500);
    expect(sources[0].transactionCount).toBe(2);
  });

  it("falls back to the description when no merchant was resolved", () => {
    const summaries = [
      makeSummary("Income", 200, [
        makeTransaction({ Merchant: undefined, Description: "INTEREST PAYMENT", Amount: 200 }),
      ]),
    ];

    const sources = getIncomeSources(summaries);

    expect(sources[0].name).toBe("INTEREST PAYMENT");
  });

  it("computes percentOfIncome relative to the total across all sources", () => {
    const summaries = [
      makeSummary("Income", 1000, [
        makeTransaction({ Merchant: "Employer", Amount: 750 }),
        makeTransaction({ Merchant: "Freelance", Amount: 250 }),
      ]),
    ];

    const sources = getIncomeSources(summaries);
    const employer = sources.find(s => s.name === "Employer");
    const freelance = sources.find(s => s.name === "Freelance");

    expect(employer?.percentOfIncome).toBe(75);
    expect(freelance?.percentOfIncome).toBe(25);
  });

  it("returns 0 percent instead of dividing by zero when total income is zero", () => {
    const summaries = [makeSummary("Income", 0, [makeTransaction({ Amount: 0 })])];

    const sources = getIncomeSources(summaries);

    expect(sources[0].percentOfIncome).toBe(0);
  });

  it("sorts sources by totalAmount descending", () => {
    const summaries = [
      makeSummary("Income", 1300, [
        makeTransaction({ Merchant: "Small", Amount: 300 }),
        makeTransaction({ Merchant: "Big", Amount: 1000 }),
      ]),
    ];

    const sources = getIncomeSources(summaries);

    expect(sources.map(s => s.name)).toEqual(["Big", "Small"]);
  });

  it("caps topTransactions at 5 but keeps the full list in allTransactions", () => {
    const transactions = Array.from({ length: 7 }, (_, i) =>
      makeTransaction({ Merchant: "Employer", Amount: i + 1, Description: `payment-${i}` }),
    );
    const summaries = [makeSummary("Income", 28, transactions)];

    const sources = getIncomeSources(summaries);

    expect(sources[0].topTransactions).toHaveLength(5);
    expect(sources[0].allTransactions).toHaveLength(7);
    // both lists are sorted by amount descending
    expect(sources[0].topTransactions[0].amount).toBe(7);
    expect(sources[0].allTransactions[6].amount).toBe(1);
  });
});

describe("getTopCategories", () => {
  it("excludes the Income category", () => {
    const summaries = [
      makeSummary("Income", 5000, [makeTransaction({ Amount: 5000 })]),
      makeSummary("Groceries", 200, [makeTransaction({ Amount: -200 })]),
    ];

    const categories = getTopCategories(summaries);

    expect(categories.map(c => c.categoryName)).toEqual(["Groceries"]);
  });

  it("sorts by TotalAmount descending and respects the limit", () => {
    const summaries = [
      makeSummary("Small", 50, [makeTransaction({ Amount: -50 })]),
      makeSummary("Big", 500, [makeTransaction({ Amount: -500 })]),
      makeSummary("Medium", 200, [makeTransaction({ Amount: -200 })]),
    ];

    const categories = getTopCategories(summaries, 2);

    expect(categories.map(c => c.categoryName)).toEqual(["Big", "Medium"]);
  });

  it("computes percentOfTotal relative to total spending across all categories", () => {
    const summaries = [
      makeSummary("Big", 750, [makeTransaction({ Amount: -750 })]),
      makeSummary("Small", 250, [makeTransaction({ Amount: -250 })]),
    ];

    const categories = getTopCategories(summaries);

    expect(categories.find(c => c.categoryName === "Big")?.percentOfTotal).toBe(75);
    expect(categories.find(c => c.categoryName === "Small")?.percentOfTotal).toBe(25);
  });

  it("caps topTransactions at 5 and sorts transactions by amount descending", () => {
    const transactions = Array.from({ length: 7 }, (_, i) =>
      makeTransaction({ Amount: -(i + 1), Description: `expense-${i}` }),
    );
    const summaries = [makeSummary("Groceries", -28, transactions)];

    const categories = getTopCategories(summaries);

    expect(categories[0].topTransactions).toHaveLength(5);
    expect(categories[0].allTransactions).toHaveLength(7);
    expect(categories[0].topTransactions[0].amount).toBe(-1);
    expect(categories[0].allTransactions[6].amount).toBe(-7);
  });
});
