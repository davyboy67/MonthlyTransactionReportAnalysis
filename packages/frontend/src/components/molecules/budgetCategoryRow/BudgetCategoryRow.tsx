import { formatZar } from "@transaction-report/shared";
import { Warning } from "@phosphor-icons/react";
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
      <th scope="row" className="budget-row__name">
        {displayName}
      </th>

      <td className="budget-row__budget">
        <input
          className="budget-row__input"
          type="number"
          inputMode="decimal"
          autoComplete="off"
          min={0}
          step={1}
          value={amount}
          readOnly={readOnly}
          aria-label={`Budget for ${displayName}`}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        />
      </td>

      <td className="budget-row__actual">
        {hasActual ? formatZar(actual!) : <span className="budget-row__no-data">No data</span>}
      </td>

      <td className={`budget-row__diff${isOver ? " budget-row__diff--over" : diff !== undefined ? " budget-row__diff--under" : ""}`}>
        {diff !== undefined
          ? `${diff >= 0 ? "+" : "-"}${formatZar(Math.abs(diff))}`
          : <span className="budget-row__no-data">No data</span>}
      </td>

      <td className="budget-row__bar">
        {hasActual && !noBudgetSet ? (
          <div className="budget-row__bar-wrap">
            <ProgressBar value={progress} label={`${displayName} budget usage`} />
            {/* Over-budget was previously signalled by the bar turning red and
                nothing else. Green and red at these luminances converge under
                deuteranopia, so the state needs a non-colour channel too. */}
            {isOver && (
              <span className="budget-row__over-pill">
                <Warning size={12} weight="fill" aria-hidden="true" />
                Over
              </span>
            )}
          </div>
        ) : (
          <span className="budget-row__no-data">No data</span>
        )}
      </td>
    </tr>
  );
}
