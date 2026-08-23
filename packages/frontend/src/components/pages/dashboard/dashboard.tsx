import { useEffect, useRef, useState } from 'react';
import { apiClient, formatZar, formatMonthLabel } from '@transaction-report/shared';
import type { CyclePayDays, IReportAnalysis, UserProfile } from '@transaction-report/shared';
import type { CategoryBreakdownItem, IMonthlySummary } from '../../../types';
import { CategorySummary } from '../../organisms/categorySummary';
import { MonthlyOverview } from '../../organisms/monthlyOverview';
import { TopCategories } from '../../organisms/topCategories/TopCategories';
import { IncomeBreakdown } from '../../organisms/incomeBreakdown/IncomeBreakdown';
import { FileUpload } from '../../molecules/fileUpload/fileUpload';
import { MetricCards } from '../../molecules/metricComponents/MetricCards';
import { Tabs } from '../../atoms/tabs/Tabs';
import { Surface } from '../../atoms/surface/Surface';
import { MonthNav } from '../../molecules/monthNav/MonthNav';
import { PayDayDialog } from '../../molecules/payDayDialog/PayDayDialog';
import { SettingsDialog } from '../../molecules/settingsDialog/SettingsDialog';
import { InviteDialog } from '../../molecules/inviteDialog/InviteDialog';
import { useMonthSelection } from '../../../hooks/useMonthSelection';
import { BudgetTab } from '../../organisms/budgetTab/BudgetTab';
import { TrendAnalysisTab } from '../../organisms/trendAnalysisTab/TrendAnalysisTab';
import { TransactionsTab } from '../../organisms/transactionsTab/TransactionsTab';
import { getTopCategories, getIncomeSources } from '../../../utils/transactionAnalysis';
import { CaretDown, Gear, SignOut, UserPlus } from '@phosphor-icons/react';
import { ThemeControl } from '../../molecules/themeControl/ThemeControl';
import { MetricRowSkeleton, ChartSkeleton } from '../../atoms/skeleton/Skeleton';
import { useReveal } from '../../../hooks/useReveal';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [pending, setPending] = useState<{ file: File; payDays: CyclePayDays } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Bumped when a tab mutates the month's transactions, so the report below refetches.
  const [reportRefresh, setReportRefresh] = useState(0);
  const accountRef = useRef<HTMLDivElement>(null);
  // Outlives the menu items, so it is where focus returns when a dialog closes.
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const metricsReveal = useReveal<HTMLDivElement>();

  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (event: globalThis.MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

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
    setUploadError(null);

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
  }, [selectedMonth, selectedYear, reportRefresh]);

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    try {
      const payDays = await apiClient.getPayDays(selectedMonth, selectedYear);
      setPending({ file, payDays });
    } catch {
      setUploadError('Could not load your pay day settings. Refresh the page and try again.');
    }
  };

  const handleConfirmUpload = async (payDays: CyclePayDays) => {
    const file = pending?.file;
    setPending(null);
    if (!file) return;

    try {
      setLoading(true);
      setUploadError(null);

      const response = await apiClient.processStatementFile(
        file,
        selectedMonth,
        selectedYear,
        payDays
      );

      if (!response?.ReportAnalysis) {
        throw new Error('Failed to process file');
      }

      setReportAnalysis(response.ReportAnalysis);
    } catch (err) {
      console.error('Error processing file:', err);
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setUploadError(
        message ??
          'We could not read that file. Check it is a CSV exported from your bank, then try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    if (loading) {
      return (
        <>
          <MetricRowSkeleton />
          <div className="dashboard__charts">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </>
      );
    }

    if (error) {
      return <div className="dashboard-state dashboard-state--error" role="alert">{error}</div>;
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
            <FileUpload onFileUploaded={handleFileSelected} acceptedFileTypes=".csv" />
            {uploadError && (
              <p className="tab-error-text" role="alert">
                {uploadError}
              </p>
            )}
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
      reportAnalysis.CategorySummaries?.filter(
        summary => summary.CategoryName !== 'Income'
      ).map(summary => ({
        name: summary.CategoryName,
        expenditure: summary.TotalAmount,
      })) || [];

    const topCategories = getTopCategories(reportAnalysis.CategorySummaries ?? []);
    const incomeSources = getIncomeSources(reportAnalysis.CategorySummaries ?? []);

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
            Overwrite this month&apos;s report with another statement
          </p>
          <FileUpload onFileUploaded={handleFileSelected} acceptedFileTypes=".csv" />
          {uploadError && (
              <p className="tab-error-text" role="alert">
                {uploadError}
              </p>
            )}
        </div>

        <div data-reveal ref={metricsReveal}>
          <MetricCards
            totalIncome={reportAnalysis.TotalIncome}
            totalExpenses={reportAnalysis.TotalExpenses}
            totalSavings={reportAnalysis.TotalSavings}
          />
        </div>

        <div className="dashboard__charts">
          <Surface className="chart-card">
            <h2 className="chart-card__title">{monthlySummary.month} Overview</h2>
            <p className="chart-card__desc">Income vs expenses vs savings breakdown</p>
            <div className="chart-card__body">
              <div style={{ flex: 1 }}>
                <MonthlyOverview summary={monthlySummary} />
              </div>
              <div className="chart-card__insights">
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot chart-insight__dot--income"
                  />
                  <span className="chart-insight__label">Income</span>
                  <span className="chart-insight__value">
                    {formatZar(reportAnalysis.TotalIncome)}
                  </span>
                </div>
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot chart-insight__dot--expenses"
                  />
                  <span className="chart-insight__label">Expenses</span>
                  <span className="chart-insight__value">
                    {formatZar(reportAnalysis.TotalExpenses)}
                  </span>
                </div>
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot chart-insight__dot--savings"
                  />
                  <span className="chart-insight__label">Savings</span>
                  <span className="chart-insight__value">
                    {formatZar(reportAnalysis.TotalSavings)}
                  </span>
                </div>
              </div>
            </div>
          </Surface>

          <Surface className="chart-card">
            <h2 className="chart-card__title">Category Breakdown</h2>
            <p className="chart-card__desc">Spending by category this month</p>
            <CategorySummary summaries={categorySummaries} />
          </Surface>
        </div>

        <IncomeBreakdown sources={incomeSources} />

        <TopCategories categories={topCategories} />
      </>
    );
  };

  const renderBudgetsTab = () => (
    <BudgetTab selection={selection} reportAnalysis={reportAnalysis ?? undefined} />
  );

  const renderTrendsTab = () => <TrendAnalysisTab />;

  const renderTransactionsTab = () => (
    <TransactionsTab
      selection={selection}
      onCategoriesSaved={() => setReportRefresh(n => n + 1)}
    />
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <main className="dashboard" id="main">
        <div className="dashboard__topbar">
          <span className="dashboard__topbar-spacer" aria-hidden="true" />
          <Tabs tabs={DASHBOARD_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="dashboard__account" ref={accountRef}>
            {profile && (
              <button
                ref={accountButtonRef}
                className="dashboard__user"
                onClick={() => setMenuOpen(open => !open)}
                // A disclosure, not role="menu": the theme control inside is a
                // radio-style group, not menuitem children.
                aria-expanded={menuOpen}
                aria-controls="account-menu"
                aria-label={`Account menu for ${profile.firstName} ${profile.lastName}`}
              >
                <span className="dashboard__user-avatar" aria-hidden="true">
                  {profile.firstName.charAt(0)}
                </span>
                <span className="dashboard__user-name">
                  {profile.firstName} {profile.lastName}
                </span>
                <CaretDown className="dashboard__user-caret" size={12} aria-hidden="true" />
              </button>
            )}
            {menuOpen && (
              <div className="dashboard__menu" id="account-menu">
                <ThemeControl />
                <hr className="dashboard__menu-separator" />
                {profile?.isOwner && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowInvite(true);
                    }}
                  >
                    <UserPlus size={15} aria-hidden="true" />
                    Invite someone
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowSettings(true);
                  }}
                >
                  <Gear size={15} aria-hidden="true" />
                  Settings
                </button>
                <button onClick={() => apiClient.logout()}>
                  <SignOut size={15} aria-hidden="true" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>

        {DASHBOARD_TABS.map(tab =>
          activeTab === tab.id ? (
            <div
              key={tab.id}
              id={`tabpanel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              tabIndex={0}
              className="dashboard__panel"
            >
              {tab.id === 'overview' && renderOverviewTab()}
              {tab.id === 'budgets' && renderBudgetsTab()}
              {tab.id === 'trends' && renderTrendsTab()}
              {tab.id === 'transactions' && renderTransactionsTab()}
            </div>
          ) : null
        )}

        {pending && (
          <PayDayDialog
            month={selectedMonth}
            year={selectedYear}
            fileName={pending.file.name}
            initial={pending.payDays}
            onConfirm={handleConfirmUpload}
            onCancel={() => setPending(null)}
          />
        )}

        {showSettings && profile && (
          <SettingsDialog
            payDay={profile.payDay}
            returnFocusTo={accountButtonRef}
            onSaved={payDay => setProfile({ ...profile, payDay })}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showInvite && (
          <InviteDialog onClose={() => setShowInvite(false)} returnFocusTo={accountButtonRef} />
        )}
      </main>
    </>
  );
}
