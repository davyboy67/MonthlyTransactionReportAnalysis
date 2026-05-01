import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@transaction-report/shared';
import type { IBudget, IBudgetCategory, IReportAnalysis } from '@transaction-report/shared';
import { BudgetTable } from '../budgetTable/BudgetTable';
import { createDefaultCategories } from '../../../utils/categoryUtils';
import './BudgetTab.css';

interface BudgetTabProps {
  reportAnalysis?: IReportAnalysis;
}

const fmt = (n: number) =>
  `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
}

function isPastMonth(month: number, year: number): boolean {
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

export function BudgetTab({ reportAnalysis }: BudgetTabProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [categories, setCategories] = useState<IBudgetCategory[]>(createDefaultCategories);
  const [budgetId, setBudgetId] = useState(0);
  const [usePreviousBudget, setUsePreviousBudget] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const readOnly = isPastMonth(selectedMonth, selectedYear);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setSaveError(null);
    setUsePreviousBudget(false);

    apiClient
      .getBudgetForMonth(selectedMonth, selectedYear)
      .then(response => {
        if (cancelled) return;
        setCategories(response.budget.categories);
        setBudgetId(response.budget.budget_id);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories(createDefaultCategories());
        setBudgetId(0);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, selectedYear]);

  // Build actuals map from report — only when the report month matches selected month
  const actuals = useMemo<Record<string, number> | undefined>(() => {
    if (!reportAnalysis?.CategorySummaries) return undefined;
    const reportDate = new Date(reportAnalysis.Date);
    if (reportDate.getMonth() + 1 !== selectedMonth || reportDate.getFullYear() !== selectedYear)
      return undefined;
    return Object.fromEntries(
      reportAnalysis.CategorySummaries.map(s => [s.CategoryName, s.TotalAmount])
    );
  }, [reportAnalysis, selectedMonth, selectedYear]);

  const totalBudgeted = categories.reduce((sum, c) => sum + c.amount, 0);
  const totalIncome = actuals ? reportAnalysis!.TotalIncome : undefined;
  const vsIncomePercent =
    totalIncome && totalIncome > 0 ? Math.round((totalBudgeted / totalIncome) * 100) : undefined;
  const unallocated = totalIncome !== undefined ? totalIncome - totalBudgeted : undefined;

  const navigateMonth = (delta: number) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y++;
    }
    if (m < 1) {
      m = 12;
      y--;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const handleAmountChange = (categoryId: number, amount: number) => {
    setCategories(prev => prev.map(c => (c.category_id === categoryId ? { ...c, amount } : c)));
  };

  const handleUsePreviousBudget = async (checked: boolean) => {
    setUsePreviousBudget(checked);
    if (checked) {
      try {
        const response = await apiClient.getLatestBudget();
        if (response.budget?.categories) {
          setCategories(prev =>
            prev.map(cat => {
              const prev_cat = response.budget!.categories.find(
                p => p.category_name === cat.category_name
              );
              return prev_cat ? { ...cat, amount: prev_cat.amount } : cat;
            })
          );
        }
      } catch {
        setUsePreviousBudget(false);
      }
    } else {
      try {
        const response = await apiClient.getBudgetForMonth(selectedMonth, selectedYear);
        setCategories(response.budget.categories);
        setBudgetId(response.budget.budget_id);
      } catch {
        setCategories(createDefaultCategories());
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const budget: IBudget = {
        budget_id: budgetId,
        user_id: 1,
        budget_month: new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)),
        notes: null,
        created_at: new Date(),
        updated_at: null,
        categories,
      };
      await apiClient.saveOrUpdateBudget(budget);
      const response = await apiClient.getBudgetForMonth(selectedMonth, selectedYear);
      setCategories(response.budget.categories);
      setBudgetId(response.budget.budget_id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save budget');
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
            disabled={readOnly || isLoading}
            onChange={e => handleUsePreviousBudget(e.target.checked)}
          />
          Use previous budget
        </label>

        <div className="budget-tab__actions">
          {saveError && <span className="budget-tab__error">{saveError}</span>}
          {readOnly ? (
            <span className="budget-tab__lock-badge">Read only — month has ended</span>
          ) : (
            <button
              className="budget-tab__save-btn"
              onClick={handleSave}
              disabled={isSaving || isLoading}
            >
              {isSaving ? 'Saving…' : budgetId > 0 ? 'Update Budget' : 'Save Budget'}
            </button>
          )}
        </div>
      </div>

      <div className="budget-tab__summary">
        <div className="budget-tab__metric">
          <span className="budget-tab__metric-label">Total Budgeted</span>
          <span className="budget-tab__metric-value">{fmt(totalBudgeted)}</span>
        </div>
        <div className="budget-tab__metric">
          <span className="budget-tab__metric-label">vs Income</span>
          {vsIncomePercent !== undefined ? (
            <span className="budget-tab__metric-value">{vsIncomePercent}%</span>
          ) : (
            <span className="budget-tab__metric-value budget-tab__metric-value--muted">
              — <small>load the matching month's report</small>
            </span>
          )}
        </div>
        <div className="budget-tab__metric">
          <span className="budget-tab__metric-label">Unallocated</span>
          {unallocated !== undefined ? (
            <span
              className={`budget-tab__metric-value${unallocated < 0 ? ' budget-tab__metric-value--negative' : ''}`}
            >
              {fmt(Math.abs(unallocated))}
              {unallocated < 0 && <small> over-budgeted</small>}
            </span>
          ) : (
            <span className="budget-tab__metric-value budget-tab__metric-value--muted">
              — <small>load the matching month's report</small>
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="budget-tab__loading">Loading…</div>
      ) : (
        <BudgetTable
          categories={categories}
          actuals={actuals}
          readOnly={readOnly}
          onChange={handleAmountChange}
        />
      )}
    </div>
  );
}
