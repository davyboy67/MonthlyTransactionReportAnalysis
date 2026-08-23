import { useEffect, useMemo, useState } from 'react';
import { apiClient, buildDefaultBudgetCategories, formatZar } from '@transaction-report/shared';
import type { CategoryDefinition } from '@transaction-report/shared';
import type { IBudget, IBudgetCategory, IReportAnalysis } from '@transaction-report/shared';
import { BudgetTable } from '../budgetTable/BudgetTable';
import { Surface } from '../../atoms/surface/Surface';
import { TableSkeleton } from '../../atoms/skeleton/Skeleton';
import { MonthNav } from '../../molecules/monthNav/MonthNav';
import type { MonthSelection } from '../../../hooks/useMonthSelection';
import './BudgetTab.css';

interface BudgetTabProps {
  selection: MonthSelection;
  reportAnalysis?: IReportAnalysis;
}

const fmt = (n: number) => formatZar(n);

export function BudgetTab({ selection, reportAnalysis }: BudgetTabProps) {
  const { month: selectedMonth, year: selectedYear, isPastMonth: readOnly } = selection;
  const [savedCategories, setCategories] = useState<IBudgetCategory[]>([]);
  const [categoryDefinitions, setCategoryDefinitions] = useState<CategoryDefinition[]>([]);

  useEffect(() => {
    apiClient
      .getCategories()
      .then(setCategoryDefinitions)
      .catch(() => setSaveError('Failed to load categories'));
  }, []);

  // Derived, not stored: falling back to defaults before the category list loads would be empty.
  const categories =
    savedCategories.length > 0 ? savedCategories : buildDefaultBudgetCategories(categoryDefinitions);
  const [budgetId, setBudgetId] = useState(0);
  const [usePreviousBudget, setUsePreviousBudget] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const incomeCategory = categories.find(c => c.category_name === 'Income');
  const expenseCategories = categories.filter(c => c.category_name !== 'Income');
  const anticipatedIncome = incomeCategory?.amount ?? 0;

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
        setCategories([]);
        setBudgetId(0);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, selectedYear]);

  const actuals = useMemo<Record<string, number> | undefined>(() => {
    if (!reportAnalysis?.CategorySummaries) return undefined;
    const reportDate = new Date(reportAnalysis.Date);
    if (reportDate.getMonth() + 1 !== selectedMonth || reportDate.getFullYear() !== selectedYear)
      return undefined;
    return Object.fromEntries(
      reportAnalysis.CategorySummaries.map(s => [s.CategoryName, s.TotalAmount])
    );
  }, [reportAnalysis, selectedMonth, selectedYear]);

  const actualIncome = actuals ? (reportAnalysis!.TotalIncome ?? 0) : undefined;

  // Use actual income when report is loaded; otherwise fall back to anticipated for immediate feedback
  const effectiveIncome = actualIncome ?? (anticipatedIncome > 0 ? anticipatedIncome : undefined);

  const totalBudgeted = expenseCategories.reduce((sum, c) => sum + c.amount, 0);
  const vsIncomePercent =
    effectiveIncome && effectiveIncome > 0
      ? Math.round((totalBudgeted / effectiveIncome) * 100)
      : undefined;
  const unallocated = effectiveIncome !== undefined ? effectiveIncome - totalBudgeted : undefined;

  // Edits go through the derived list: `savedCategories` is empty until a budget loads, and
  // mapping over an empty array would drop the edit.
  const handleAmountChange = (categoryId: number, amount: number) => {
    setCategories(categories.map(c => (c.category_id === categoryId ? { ...c, amount } : c)));
  };

  const handleAnticipatedIncomeChange = (value: number) => {
    if (!incomeCategory) return;
    handleAmountChange(incomeCategory.category_id, value);
  };

  const handleUsePreviousBudget = async (checked: boolean) => {
    setUsePreviousBudget(checked);
    if (checked) {
      try {
        const response = await apiClient.getLatestBudget();
        if (response.budget?.categories) {
          setCategories(
            categories.map(cat => {
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
        setCategories([]);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const budget: IBudget = {
        budget_id: budgetId,
        // Placeholder only — the server overwrites this with the authenticated
        // user's id from the JWT. The client value is never trusted.
        user_id: 0,
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
      <Surface className="tab-header">
        {/* No forward clamp — budgets can be planned for future months. */}
        <MonthNav month={selectedMonth} year={selectedYear} onNavigate={selection.navigate} />

        <div className="budget-tab__income-field">
          <label className="budget-tab__income-label" htmlFor="anticipated-income">
            Anticipated Income
          </label>
          {readOnly ? (
            <span className="budget-tab__income-static">{fmt(anticipatedIncome)}</span>
          ) : (
            <div className="budget-tab__income-input-wrap">
              <span className="budget-tab__income-prefix">R</span>
              <input
                className="budget-tab__income-input"
                type="number"
                id="anticipated-income"
                inputMode="decimal"
                autoComplete="off"
                min={0}
                step={100}
                value={anticipatedIncome || ''}
                placeholder="0.00"
                disabled={isLoading}
                onChange={e => handleAnticipatedIncomeChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          {actualIncome !== undefined && (
            <span className="budget-tab__income-actual">Actual: {fmt(actualIncome)}</span>
          )}
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

        <div className="tab-actions">
          {saveError && <span className="tab-error-text">{saveError}</span>}
          {readOnly ? (
            <span className="tab-amber-badge">Read only, month has ended</span>
          ) : (
            <button
              className="tab-primary-btn"
              onClick={handleSave}
              disabled={isSaving || isLoading}
            >
              {isSaving ? 'Saving…' : budgetId > 0 ? 'Update Budget' : 'Save Budget'}
            </button>
          )}
        </div>
      </Surface>

      <Surface className="budget-tab__summary">
        <div className="budget-tab__metric">
          <span className="budget-tab__metric-label">Total Budgeted</span>
          <span className="budget-tab__metric-value">{fmt(totalBudgeted)}</span>
        </div>
        <div className="budget-tab__metric">
          <span className="budget-tab__metric-label">
            vs {actualIncome !== undefined ? 'Actual' : 'Anticipated'} Income
          </span>
          {vsIncomePercent !== undefined ? (
            <span className="budget-tab__metric-value">{vsIncomePercent}%</span>
          ) : (
            <span className="budget-tab__metric-value budget-tab__metric-value--muted">
              <small>Set anticipated income above</small>
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
              <small>Set anticipated income above</small>
            </span>
          )}
        </div>
      </Surface>

      {isLoading ? (
        <Surface>
          <TableSkeleton rows={8} />
        </Surface>
      ) : (
        <BudgetTable
          categories={expenseCategories}
          categoryDefinitions={categoryDefinitions}
          actuals={actuals}
          readOnly={readOnly}
          onChange={handleAmountChange}
        />
      )}
    </div>
  );
}
