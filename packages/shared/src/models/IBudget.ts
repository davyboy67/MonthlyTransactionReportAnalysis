import { IBudgetCategory } from './IBudgetCategory';

export interface IBudget {
  budget_id: number;
  user_id: number;
  budget_month: Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date | null;
  categories: IBudgetCategory[];
}
