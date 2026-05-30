import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@transaction-report/shared';
import type { IReportAnalysis, ITransaction } from '@transaction-report/shared';
import { GlassPanel } from '../../atoms/glassPanel/GlassPanel';
import categoryList from '../../../../../shared/src/data/categoryList.json';
import './TransactionsTab.css';

interface TransactionsTabProps {
  reportAnalysis?: IReportAnalysis;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAmount(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function TransactionsTab({ reportAnalysis: initialReport }: TransactionsTabProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<IReportAnalysis | null>(initialReport ?? null);
  const [loading, setLoading] = useState(!initialReport);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<number, string>>(new Map());

  const fetchReport = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError(null);
    setPendingChanges(new Map());
    try {
      const res = await apiClient.getReportForMonth(m, y);
      setReport(res.ReportAnalysis);
    } catch {
      setError('Failed to load transactions');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(month, year);
  }, [month, year, fetchReport]);

  const navigateMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const handleCategoryChange = (transaction: ITransaction, newCategory: string) => {
    if (transaction.id == null) return;
    const id = transaction.id;
    setPendingChanges(prev => {
      const next = new Map(prev);
      if (newCategory === transaction.Category) {
        next.delete(id);
      } else {
        next.set(id, newCategory);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const updates = [...pendingChanges.entries()].map(([id, category]) => ({ id, category }));
      await apiClient.updateTransactionCategories(updates);
      await fetchReport(month, year);
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPendingChanges(new Map());
  };

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const hasPendingChanges = pendingChanges.size > 0;

  const allTransactions: ITransaction[] = report?.CategorySummaries.flatMap(cs => cs.Transactions) ?? [];

  return (
    <div className="transactions-tab">
      <GlassPanel className="tab-header">
        <div className="tab-month-nav">
          <button className="tab-nav-btn" onClick={() => navigateMonth(-1)} aria-label="Previous month">←</button>
          <span className="tab-month-label">{formatMonthLabel(month, year)}</span>
          <button className="tab-nav-btn" onClick={() => navigateMonth(1)} disabled={isCurrentMonth} aria-label="Next month">→</button>
        </div>

        <div className="tab-actions">
          {hasPendingChanges && (
            <span className="tab-amber-badge">{pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}</span>
          )}
          <button
            className="tab-ghost-btn"
            onClick={handleReset}
            disabled={!hasPendingChanges || saving}
          >
            Reset
          </button>
          <button
            className="tab-primary-btn"
            onClick={handleSave}
            disabled={!hasPendingChanges || saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </GlassPanel>

      {error && <div className="transactions-tab__error">{error}</div>}

      {loading ? (
        <GlassPanel><div className="tab-state-block">Loading transactions…</div></GlassPanel>
      ) : !report || allTransactions.length === 0 ? (
        <GlassPanel><div className="tab-state-block">
          No transactions found for {formatMonthLabel(month, year)}.
        </div></GlassPanel>
      ) : (
        report.CategorySummaries
          .filter(cs => cs.Transactions.length > 0)
          .map(cs => (
            <GlassPanel key={cs.CategoryName} className="transactions-tab__group">
              <div className="transactions-tab__group-header">
                <span className="transactions-tab__group-name">{cs.CategoryName}</span>
                <span className="transactions-tab__group-total">{formatAmount(cs.TotalAmount)}</span>
              </div>
              <table className="transactions-tab__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {cs.Transactions.map((t, idx) => {
                    const transactionId = t.id;
                    const isPending = transactionId != null && pendingChanges.has(transactionId);
                    const currentCategory = (transactionId != null ? pendingChanges.get(transactionId) : undefined) ?? t.Category;
                    return (
                      <tr key={transactionId ?? idx} className={isPending ? 'transactions-tab__row--changed' : ''}>
                        <td className="transactions-tab__cell--date">{formatDate(t.Date)}</td>
                        <td className="transactions-tab__cell--desc">{t.Description}</td>
                        <td className="transactions-tab__cell--amount">{formatAmount(t.Amount)}</td>
                        <td className="transactions-tab__cell--category">
                          <select
                            className={`transactions-tab__select${isPending ? ' transactions-tab__select--changed' : ''}`}
                            value={currentCategory}
                            onChange={e => handleCategoryChange(t, e.target.value)}
                          >
                            {categoryList.map(cat => (
                              <option key={cat.name} value={cat.name}>{cat.displayName}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassPanel>
          ))
      )}
    </div>
  );
}
