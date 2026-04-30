import { ProgressBar } from "../../atoms/progressBar/ProgressBar";
import "./BudgetCategoryRow.css";

interface BudgetCategoryRowProps {
  displayName: string;
  amount: number;
  actual?: number;
  readOnly?: boolean;
  onChange: (amount: number) => void;
}

export function BudgetCategoryRow({
  displayName,
  amount,
  actual,
  readOnly,
  onChange,
}: BudgetCategoryRowProps) {
  const hasActual = actual !== undefined;
  const noBudgetSet = amount === 0;
  const diff = hasActual && !noBudgetSet ? amount - actual : undefined;
  const progress = hasActual && amount > 0 ? actual / amount : 0;
  const isOver = diff !== undefined && diff < 0;

  return (
    <tr className="budget-row">
      <td className="budget-row__name">{displayName}</td>

      <td className="budget-row__budget">
        <input
          className="budget-row__input"
          type="number"
          min={0}
          step={1}
          value={amount}
          readOnly={readOnly}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        />
      </td>

      <td className="budget-row__actual">
        {hasActual ? `R ${actual!.toFixed(2)}` : "—"}
      </td>

      <td className={`budget-row__diff${isOver ? " budget-row__diff--over" : diff !== undefined ? " budget-row__diff--under" : ""}`}>
        {diff !== undefined
          ? `${diff >= 0 ? "+" : ""}R ${diff.toFixed(2)}`
          : "—"}
      </td>

      <td className="budget-row__bar">
        {hasActual && !noBudgetSet ? (
          <ProgressBar value={progress} />
        ) : (
          <span className="budget-row__no-data">—</span>
        )}
      </td>
    </tr>
  );
}
