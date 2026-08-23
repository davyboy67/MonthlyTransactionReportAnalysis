import { useState } from 'react';
import { formatZar, formatPercent, formatDayMonth } from '@transaction-report/shared';
import { Surface } from '../../atoms/surface/Surface';
import './RankedList.css';

/**
 * Shared by Top Spending Categories and Income Breakdown. Presentation only:
 * each caller maps its own domain type into RankedListItem, so the two can
 * differ in wording and data without the layouts drifting apart again.
 */

export interface RankedListRow {
  key: string;
  label: string;
  date: string | Date;
  amount: number;
}

export interface RankedListItem {
  key: string;
  name: string;
  /** e.g. "3 transactions" or "1 payment". */
  countLabel: string;
  totalAmount: number;
  percent: number;
  /** e.g. "of spending" or "of income". */
  percentSuffix: string;
  visibleRows: RankedListRow[];
  allRows: RankedListRow[];
  expandLabel: string;
}

interface RankedListProps {
  title: string;
  subtitle: string;
  accent: 'income' | 'savings';
  items: RankedListItem[];
}

function RankedCard({ item, rank, accent }: { item: RankedListItem; rank: number; accent: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = item.allRows.length > item.visibleRows.length;
  const rows = expanded ? item.allRows : item.visibleRows;

  return (
    <Surface className="ranked-card" as="li">
      <div className="ranked-card__header">
        <span className="ranked-card__rank" aria-hidden="true">
          {String(rank).padStart(2, '0')}
        </span>
        <div className="ranked-card__info">
          <span className="ranked-card__name">{item.name}</span>
          <span className="ranked-card__count">{item.countLabel}</span>
        </div>
        <div className="ranked-card__amounts">
          <span className="ranked-card__total">{formatZar(item.totalAmount)}</span>
          <span className="ranked-card__percent">
            {formatPercent(item.percent)} {item.percentSuffix}
          </span>
        </div>
      </div>

      <div
        className={`ranked-card__progress ranked-card__progress--${accent}`}
        role="progressbar"
        aria-valuenow={Math.round(item.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${item.name}, ${formatPercent(item.percent)} ${item.percentSuffix}`}
      >
        <div
          className="ranked-card__progress-fill"
          style={{ width: `${Math.min(item.percent, 100)}%` }}
        />
      </div>

      <div className="ranked-card__rows">
        {rows.map(row => (
          <div key={row.key} className="ranked-card__row">
            <span className="ranked-card__row-label">{row.label}</span>
            <span className="ranked-card__row-date">{formatDayMonth(row.date)}</span>
            <span className="ranked-card__row-amount">{formatZar(row.amount)}</span>
          </div>
        ))}

        {hasMore && (
          <button
            type="button"
            className="ranked-card__expand"
            aria-expanded={expanded}
            onClick={() => setExpanded(prev => !prev)}
          >
            {expanded ? 'Show less' : item.expandLabel}
          </button>
        )}
      </div>
    </Surface>
  );
}

export function RankedList({ title, subtitle, accent, items }: RankedListProps) {
  if (items.length === 0) return null;

  return (
    <section className="ranked-list">
      <div className="ranked-list__header">
        <h2 className="ranked-list__title">{title}</h2>
        <p className="ranked-list__subtitle">{subtitle}</p>
      </div>
      <ul className="ranked-list__items">
        {items.map((item, i) => (
          <RankedCard key={item.key} item={item} rank={i + 1} accent={accent} />
        ))}
      </ul>
    </section>
  );
}
