import { useEffect, useState } from 'react';
import { apiClient, formatZar, formatMonthLabel } from '@transaction-report/shared';
import type { IReportAnalysis, UserProfile } from '@transaction-report/shared';
import type { CategoryBreakdownItem, IMonthlySummary } from '../../../types';
import { CategorySummary } from '../../organisms/categorySummary';
import { MonthlyOverview } from '../../organisms/monthlyOverview';
import { TopCategories } from '../../organisms/topCategories/TopCategories';
import { FileUpload } from '../../molecules/fileUpload/fileUpload';
import { MetricCards } from '../../molecules/metricComponents/MetricCards';
import { Tabs } from '../../atoms/tabs/Tabs';
import { GlassPanel } from '../../atoms/glassPanel/GlassPanel';
import { MonthNav } from '../../molecules/monthNav/MonthNav';
import { useMonthSelection } from '../../../hooks/useMonthSelection';
import { BudgetTab } from '../../organisms/budgetTab/BudgetTab';
import { TrendAnalysisTab } from '../../organisms/trendAnalysisTab/TrendAnalysisTab';
import { TransactionsTab } from '../../organisms/transactionsTab/TransactionsTab';
import { getTopCategories } from '../../../utils/transactionAnalysis';
import { SERIES_COLORS } from '../../../theme/theme';
import './dashboard.css';

type ActiveTab = 'overview' | 'budgets' | 'trends' | 'transactions';

const DASHBOARD_TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'overview', label: 'Report Overview' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'trends', label: 'Trend Analysis' },
  { id: 'transactions', label: 'Transactions' },
];

export function Dashboard() {
  const selection = useMonthSelection();
  const { month: selectedMonth, year: selectedYear, isCurrentMonth: isOnCurrentMonth } = selection;

  const [reportAnalysis, setReportAnalysis] = useState<IReportAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load the current user's profile once so we can show who is logged in.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .getProfile()
      .then(user => {
        if (!cancelled) setProfile(user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .getReportForMonth(selectedMonth, selectedYear)
      .then(response => {
        if (!cancelled) setReportAnalysis(response.ReportAnalysis);
      })
      .catch(() => {
        if (!cancelled) {
          setReportAnalysis(null);
          setError(null); // no report for month is not an error
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, selectedYear]);

  const handleFileUploaded = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.processStatementFile(file, selectedMonth, selectedYear);

      if (!response?.ReportAnalysis) {
        throw new Error('Failed to process file');
      }

      setReportAnalysis(response.ReportAnalysis);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to process the uploaded file');
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    const showUpload = !reportAnalysis || isOnCurrentMonth;

    if (loading) {
      return <div className="dashboard-state">Loading...</div>;
    }

    if (error) {
      return <div className="dashboard-state dashboard-state--error">Error: {error}</div>;
    }

    if (!reportAnalysis) {
      return (
        <>
          <div className="dashboard__month-nav">
            <MonthNav
              month={selectedMonth}
              year={selectedYear}
              onNavigate={selection.navigate}
              disableNext={isOnCurrentMonth}
            />
          </div>
          <div className="dashboard__upload">
            <p className="dashboard__upload-title">
              {isOnCurrentMonth
                ? 'Upload your bank statement to get started'
                : `No report for ${formatMonthLabel(selectedMonth, selectedYear)}`}
            </p>
            <FileUpload onFileUploaded={handleFileUploaded} acceptedFileTypes=".csv" />
          </div>
        </>
      );
    }

    const reportDate = new Date(reportAnalysis.Date);
    const monthlySummary: IMonthlySummary = {
      month: formatMonthLabel(reportDate.getMonth() + 1, reportDate.getFullYear()),
      totalIncome: reportAnalysis.TotalIncome,
      totalExpenses: reportAnalysis.TotalExpenses,
      totalSavings: reportAnalysis.TotalSavings,
    };

    const categorySummaries: CategoryBreakdownItem[] =
      reportAnalysis.CategorySummaries?.map(summary => ({
        name: summary.CategoryName,
        expenditure: summary.TotalAmount,
      })) || [];

    const topCategories = getTopCategories(reportAnalysis.CategorySummaries ?? []);

    return (
      <>
        <div className="dashboard__month-nav">
          <MonthNav
            month={selectedMonth}
            year={selectedYear}
            onNavigate={selection.navigate}
            disableNext={isOnCurrentMonth}
          />
        </div>

        {showUpload && (
          <div className="dashboard__upload">
            <p className="dashboard__upload-title">Upload a new bank statement</p>
            <FileUpload onFileUploaded={handleFileUploaded} acceptedFileTypes=".csv" />
          </div>
        )}

        <MetricCards
          totalIncome={reportAnalysis.TotalIncome}
          totalExpenses={reportAnalysis.TotalExpenses}
          totalSavings={reportAnalysis.TotalSavings}
        />

        <div className="dashboard__charts">
          <GlassPanel className="chart-card">
            <h2 className="chart-card__title">{monthlySummary.month} Overview</h2>
            <p className="chart-card__desc">Income vs expenses vs savings breakdown</p>
            <div className="chart-card__body">
              <div style={{ flex: 1 }}>
                <MonthlyOverview summary={monthlySummary} />
              </div>
              <div className="chart-card__insights">
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot"
                    style={{ background: SERIES_COLORS.income }}
                  />
                  <span className="chart-insight__label">Income</span>
                  <span className="chart-insight__value">
                    {formatZar(reportAnalysis.TotalIncome)}
                  </span>
                </div>
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot"
                    style={{ background: SERIES_COLORS.expenses }}
                  />
                  <span className="chart-insight__label">Expenses</span>
                  <span className="chart-insight__value">
                    {formatZar(reportAnalysis.TotalExpenses)}
                  </span>
                </div>
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot"
                    style={{ background: SERIES_COLORS.savings }}
                  />
                  <span className="chart-insight__label">Savings</span>
                  <span className="chart-insight__value">
                    {formatZar(reportAnalysis.TotalSavings)}
                  </span>
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="chart-card">
            <h2 className="chart-card__title">Category Breakdown</h2>
            <p className="chart-card__desc">Spending by category this month</p>
            <CategorySummary summaries={categorySummaries} />
          </GlassPanel>
        </div>

        <TopCategories categories={topCategories} />
      </>
    );
  };

  const renderBudgetsTab = () => (
    <BudgetTab selection={selection} reportAnalysis={reportAnalysis ?? undefined} />
  );

  const renderTrendsTab = () => <TrendAnalysisTab />;

  const renderTransactionsTab = () => <TransactionsTab selection={selection} />;

  return (
    <main className="dashboard">
      <div className="dashboard__topbar">
        <span className="dashboard__topbar-spacer" aria-hidden="true" />
        <Tabs tabs={DASHBOARD_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="dashboard__account">
          {profile && (
            <span
              className="dashboard__user"
              title={`Signed in as ${profile.firstName} ${profile.lastName}`}
            >
              <span className="dashboard__user-avatar">{profile.firstName.charAt(0)}</span>
              <span className="dashboard__user-name">
                {profile.firstName} {profile.lastName}
              </span>
            </span>
          )}
          <button
            className="dashboard__logout tab-ghost-btn"
            onClick={() => apiClient.logout()}
            title="Log out and switch account"
          >
            Log out
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? renderOverviewTab() : null}
      {activeTab === 'budgets' ? renderBudgetsTab() : null}
      {activeTab === 'trends' ? renderTrendsTab() : null}
      {activeTab === 'transactions' ? renderTransactionsTab() : null}
    </main>
  );
}
