import { useState } from "react";
import type { IBudgetCategory } from "@transaction-report/shared";
import { BudgetTable } from "../budgetTable/BudgetTable";
import { createDefaultCategories } from "../../../utils/categoryUtils";
import "./BudgetTab.css";

function formatMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

function isPastMonth(month: number, year: number): boolean {
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

export function BudgetTab() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [categories, setCategories] = useState<IBudgetCategory[]>(createDefaultCategories);
  const [usePreviousBudget, setUsePreviousBudget] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const readOnly = isPastMonth(selectedMonth, selectedYear);
  const totalBudgeted = categories.reduce((sum, c) => sum + c.amount, 0);

  const navigateMonth = (delta: number) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(m);
    setSelectedYear(y);
    setCategories(createDefaultCategories());
    // TODO: fetch budget for (m, y) from apiClient and populate categories
  };

  const handleAmountChange = (categoryId: number, amount: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.category_id === categoryId ? { ...c, amount } : c))
    );
  };

  const handleUsePreviousBudget = (checked: boolean) => {
    setUsePreviousBudget(checked);
    if (checked) {
      // TODO: call apiClient.getMostRecentBudget() and apply amounts
    } else {
      setCategories(createDefaultCategories());
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: call apiClient.saveOrUpdateBudget({ budget_id, categories, budget_month, ... })
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="budget-tab">
      <div className="budget-tab__header">
        <div className="budget-tab__month-nav">
          <button
            className="budget-tab__nav-btn"
            onClick={() => navigateMonth(-1)}
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="budget-tab__month-label">
            {formatMonthLabel(selectedMonth, selectedYear)}
          </span>
          <button
            className="budget-tab__nav-btn"
            onClick={() => navigateMonth(1)}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <label className="budget-tab__prev-label">
          <input
            type="checkbox"
            checked={usePreviousBudget}
            disabled={readOnly}
            onChange={(e) => handleUsePreviousBudget(e.target.checked)}
          />
          Use latest previous budget
        </label>

        <div className="budget-tab__actions">
          {readOnly ? (
            <span className="budget-tab__lock-badge">Read only — month has ended</span>
          ) : (
            <button
              className="budget-tab__save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save Budget"}
            </button>
          )}
        </div>
      </div>

      <div className="budget-tab__summary">
        <div className="budget-tab__metric">
          <span className="budget-tab__metric-label">Total Budgeted</span>
          <span className="budget-tab__metric-value">
            R {totalBudgeted.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="budget-tab__metric">
          <span className="budget-tab__metric-label">vs Income</span>
          <span className="budget-tab__metric-value budget-tab__metric-value--muted">
            — <small>available when report loaded</small>
          </span>
        </div>
        <div className="budget-tab__metric">
          <span className="budget-tab__metric-label">Unallocated</span>
          <span className="budget-tab__metric-value budget-tab__metric-value--muted">
            — <small>available when report loaded</small>
          </span>
        </div>
      </div>

      <BudgetTable
        categories={categories}
        readOnly={readOnly}
        onChange={handleAmountChange}
      />
    </div>
  );
}
