import { useState } from "react";
import { formatZar } from "@transaction-report/shared";
import type {
  IncomeSource,
  TopTransaction,
} from "../../../utils/transactionAnalysis";
import { GlassPanel } from "../../atoms/glassPanel/GlassPanel";
import "./IncomeBreakdown.css";

function txKey(tx: TopTransaction, index: number): string {
  return `${index}-${tx.description}`;
}

interface IncomeSourceCardProps {
  source: IncomeSource;
  rank: number;
}

function IncomeSourceCard({ source, rank }: IncomeSourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = source.transactionCount > 5;
  const displayedTransactions = expanded
    ? source.allTransactions
    : source.topTransactions;

  return (
    <GlassPanel className="income-source-card">
      <div className="income-source-card__inner">
        <div className="income-source-card__header">
          <span className="income-source-card__rank">{String(rank).padStart(2, "0")}</span>
          <div className="income-source-card__info">
            <span className="income-source-card__name">{source.name}</span>
            <span className="income-source-card__count">
              {source.transactionCount} payment
              {source.transactionCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="income-source-card__amounts">
            <span className="income-source-card__total">
              {formatZar(source.totalAmount)}
            </span>
            <span className="income-source-card__percent">
              {source.percentOfIncome.toFixed(1)}% of income
            </span>
          </div>
        </div>

        <div className="income-source-card__progress-bar">
          <div
            className="income-source-card__progress-fill"
            style={{ width: `${Math.min(source.percentOfIncome, 100)}%` }}
          />
        </div>

        <div className="income-source-card__transactions">
          {displayedTransactions.map((tx, i) => (
            <div key={txKey(tx, i)} className="income-source-card__transaction">
              <span className="income-source-card__tx-desc">{tx.description}</span>
              <span className="income-source-card__tx-date">
                {new Date(tx.date).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="income-source-card__tx-amount">
                {formatZar(tx.amount)}
              </span>
            </div>
          ))}

          {hasMore && (
            <button
              className="income-source-card__view-all"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded
                ? "Show less"
                : `View all ${source.transactionCount} payments`}
            </button>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

interface IncomeBreakdownProps {
  sources: IncomeSource[];
}

export function IncomeBreakdown({ sources }: IncomeBreakdownProps) {
  if (sources.length === 0) return null;

  return (
    <section className="income-breakdown">
      <div className="income-breakdown__header">
        <h2 className="income-breakdown__title">Income Breakdown</h2>
        <p className="income-breakdown__subtitle">
          What makes up your income this month
        </p>
      </div>
      <div className="income-breakdown__list">
        {sources.map((source, i) => (
          <IncomeSourceCard key={source.name} source={source} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
