import { useState } from "react";
import type {
  TopCategory,
  TopTransaction,
} from "../../../utils/transactionAnalysis";
import { GlassPanel } from "../../atoms/glassPanel/GlassPanel";
import "./TopCategories.css";

const fmt = (n: number) =>
  `R ${n.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function txKey(tx: TopTransaction, index: number): string {
  return `${tx.description}-${tx.amount}-${new Date(tx.date).toISOString()}-${index}`;
}

interface CategoryCardProps {
  category: TopCategory;
  rank: number;
}

function CategoryCard({ category, rank }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = category.transactionCount > 5;
  const displayedTransactions = expanded
    ? category.allTransactions
    : category.topTransactions;

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <GlassPanel className="top-category-card">
      <div onDragOver={handleDragOver} className="top-category-card__inner">
        <div className="top-category-card__header">
          <span className="top-category-card__rank">{String(rank).padStart(2, "0")}</span>
          <div className="top-category-card__info">
            <span className="top-category-card__name">{category.categoryName}</span>
            <span className="top-category-card__count">
              {category.transactionCount} transaction
              {category.transactionCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="top-category-card__amounts">
            <span className="top-category-card__total">{fmt(category.totalAmount)}</span>
            <span className="top-category-card__percent">
              {category.percentOfTotal.toFixed(1)}% of spending
            </span>
          </div>
        </div>

        <div className="top-category-card__progress-bar">
          <div
            className="top-category-card__progress-fill"
            style={{ width: `${Math.min(category.percentOfTotal, 100)}%` }}
          />
        </div>

        <div className="top-category-card__transactions">
          {displayedTransactions.map((tx, i) => (
            <div key={txKey(tx, i)} className="top-category-card__transaction">
              <span className="top-category-card__tx-desc">
                {tx.merchant || tx.description}
              </span>
              <span className="top-category-card__tx-date">
                {new Date(tx.date).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="top-category-card__tx-amount">{fmt(tx.amount)}</span>
            </div>
          ))}

          {hasMore && (
            <button
              className="top-category-card__view-all"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded
                ? "Show less"
                : `View all ${category.transactionCount} transactions`}
            </button>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

interface TopCategoriesProps {
  categories: TopCategory[];
}

export function TopCategories({ categories }: TopCategoriesProps) {
  if (categories.length === 0) return null;

  return (
    <section className="top-categories">
      <div className="top-categories__header">
        <h2 className="top-categories__title">Top Spending Categories</h2>
        <p className="top-categories__subtitle">
          Your biggest spending areas this month
        </p>
      </div>
      <div className="top-categories__list">
        {categories.map((cat, i) => (
          <CategoryCard key={cat.categoryName} category={cat} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
