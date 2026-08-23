import type { IncomeSource } from '../../../utils/transactionAnalysis';
import { RankedList, type RankedListItem } from '../../molecules/rankedList/RankedList';

interface IncomeBreakdownProps {
  sources: IncomeSource[];
}

export function IncomeBreakdown({ sources }: IncomeBreakdownProps) {
  const items: RankedListItem[] = sources.map(source => ({
    key: source.name,
    name: source.name,
    countLabel: `${source.transactionCount} payment${source.transactionCount !== 1 ? 's' : ''}`,
    totalAmount: source.totalAmount,
    percent: source.percentOfIncome,
    percentSuffix: 'of income',
    visibleRows: source.topTransactions.map((tx, i) => ({
      key: `${i}-${tx.description}`,
      label: tx.description,
      date: tx.date,
      amount: tx.amount,
    })),
    allRows: source.allTransactions.map((tx, i) => ({
      key: `${i}-${tx.description}`,
      label: tx.description,
      date: tx.date,
      amount: tx.amount,
    })),
    expandLabel: `View all ${source.transactionCount} payments`,
  }));

  return (
    <RankedList
      title="Income Breakdown"
      subtitle="What makes up your income this month"
      accent="income"
      items={items}
    />
  );
}
