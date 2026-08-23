import type { TopCategory } from "../../../utils/transactionAnalysis";
import { RankedList, type RankedListItem } from "../../molecules/rankedList/RankedList";

interface TopCategoriesProps {
  categories: TopCategory[];
}

export function TopCategories({ categories }: TopCategoriesProps) {
  const items: RankedListItem[] = categories.map(category => ({
    key: category.categoryName,
    name: category.categoryName,
    countLabel: `${category.transactionCount} transaction${
      category.transactionCount !== 1 ? "s" : ""
    }`,
    totalAmount: category.totalAmount,
    percent: category.percentOfTotal,
    percentSuffix: "of spending",
    visibleRows: category.topTransactions.map((tx, i) => ({
      key: `${i}-${tx.description}-${tx.amount}`,
      label: tx.merchant || tx.description,
      date: tx.date,
      amount: tx.amount,
    })),
    allRows: category.allTransactions.map((tx, i) => ({
      key: `${i}-${tx.description}-${tx.amount}`,
      label: tx.merchant || tx.description,
      date: tx.date,
      amount: tx.amount,
    })),
    expandLabel: `View all ${category.transactionCount} transactions`,
  }));

  return (
    <RankedList
      title="Top Spending Categories"
      subtitle="Your biggest spending areas this month"
      accent="savings"
      items={items}
    />
  );
}
