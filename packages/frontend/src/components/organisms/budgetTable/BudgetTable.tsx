import type { CategoryDefinition, IBudgetCategory } from "@transaction-report/shared";
import { categoryDisplayName, formatZar } from "@transaction-report/shared";
import { BudgetCategoryRow } from "../../molecules/budgetCategoryRow/BudgetCategoryRow";
import "./BudgetTable.css";

interface BudgetTableProps {
  categories: IBudgetCategory[];
  categoryDefinitions: CategoryDefinition[];
  actuals?: Record<string, number>;
  readOnly?: boolean;
  onChange: (categoryId: number, amount: number) => void;
}

export function BudgetTable({
  categories,
  categoryDefinitions,
  actuals,
  readOnly,
  onChange,
}: BudgetTableProps) {
  const totalBudgeted = categories.reduce((sum, c) => sum + c.amount, 0);
  const totalActual = actuals
    ? categories.reduce((sum, c) => sum + (actuals[c.category_name] ?? 0), 0)
    : undefined;

  return (
    <div className="budget-table-wrap">
      <table className="budget-table">
        <thead>
          <tr className="budget-table__head-row">
            <th className="budget-table__th budget-table__th--name">Category</th>
            <th className="budget-table__th budget-table__th--budget">Budget (R)</th>
            <th className="budget-table__th budget-table__th--actual">Actual</th>
            <th className="budget-table__th budget-table__th--diff">Difference</th>
            <th className="budget-table__th budget-table__th--bar">Progress</th>
          </tr>
        </thead>

        <tbody>
          {categories.map((cat) => (
            <BudgetCategoryRow
              key={cat.category_id}
              displayName={categoryDisplayName(categoryDefinitions, cat.category_name)}
              amount={cat.amount}
              actual={actuals?.[cat.category_name]}
              readOnly={readOnly}
              onChange={(amount) => onChange(cat.category_id, amount)}
            />
          ))}
        </tbody>

        <tfoot>
          <tr className="budget-table__totals-row">
            <td className="budget-table__total-label">Total</td>
            <td className="budget-table__total-value">
              {formatZar(totalBudgeted)}
            </td>
            <td className="budget-table__total-value">
              {totalActual !== undefined ? formatZar(totalActual) : "No data"}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
