import { formatZar, formatMonthLabel } from "../src/utils/format";
import { dominantMonth } from "../src/utils/dateUtils";
import { buildDefaultBudgetCategories, categoryDisplayName } from "../src/data/categories";
import type { CategoryDefinition } from "../src/data/categories";
import { ITransaction, TransactionType } from "../src/models/ITransaction";

describe("formatZar", () => {
  // Compare against the same locale call so the test is not brittle to whichever
  // thousands/decimal separators the runtime's en-ZA data uses.
  const localized = (v: number, digits: number) =>
    `R ${v.toLocaleString("en-ZA", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;

  it("formats with two decimals by default", () => {
    expect(formatZar(1234.5)).toBe(localized(1234.5, 2));
  });

  it("respects a custom fraction-digit count", () => {
    expect(formatZar(1000, 0)).toBe(localized(1000, 0));
  });

  it("always prefixes with 'R '", () => {
    expect(formatZar(0).startsWith("R ")).toBe(true);
  });
});

describe("formatMonthLabel", () => {
  it("renders a 1-based month and year as a long label", () => {
    expect(formatMonthLabel(1, 2026)).toBe("January 2026");
    expect(formatMonthLabel(12, 2025)).toBe("December 2025");
  });
});

describe("dominantMonth", () => {
  const tx = (date: Date): ITransaction => ({
    Date: date,
    Description: "x",
    Amount: -1,
    Category: "",
    Merchant: "",
    Month: "",
    Type: TransactionType.Expense,
  });

  it("returns the month/year holding the most transactions", () => {
    const txs = [
      tx(new Date(2026, 1, 10)),
      tx(new Date(2026, 1, 12)),
      tx(new Date(2026, 0, 5)),
    ];

    expect(dominantMonth(txs)).toEqual({ month: 2, year: 2026 });
  });

  it("reads dates in UTC when useUtc is true", () => {
    // A date constructed at UTC midnight is unambiguous across time zones
    const txs = [tx(new Date(Date.UTC(2026, 2, 15)))];

    expect(dominantMonth(txs, true)).toEqual({ month: 3, year: 2026 });
  });

  it("throws on an empty list (callers must guard)", () => {
    expect(() => dominantMonth([])).toThrow();
  });
});

describe("category data", () => {
  const definitions: CategoryDefinition[] = [
    { name: "Groceries", displayName: "Groceries & Supermarkets" },
    { name: "Savings", displayName: "Savings & Investments" },
  ];

  it("builds one zero-amount budget category per definition", () => {
    const cats = buildDefaultBudgetCategories(definitions);

    expect(cats).toHaveLength(definitions.length);
    expect(cats.every(c => c.amount === 0 && c.budget_id === 0)).toBe(true);
    expect(cats.map(c => c.category_name)).toEqual(definitions.map(d => d.name));
  });

  it("resolves a display name, falling back to the raw name", () => {
    expect(categoryDisplayName(definitions, "Savings")).toBe("Savings & Investments");
    expect(categoryDisplayName(definitions, "Unmapped")).toBe("Unmapped");
  });

  it("produces no rows before the category list has loaded", () => {
    expect(buildDefaultBudgetCategories([])).toEqual([]);
  });
});
