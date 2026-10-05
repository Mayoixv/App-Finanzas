import { MonthKey } from './month';

export interface Budget {
  id: string;
  categoryId: string;
  month: MonthKey;
  limit: number;
}

export interface BudgetStatus {
  spent: number;
  remaining: number;
  exceeded: boolean;
}

export function budgetStatus(budget: Budget, spent: number): BudgetStatus {
  return {
    spent,
    remaining: budget.limit - spent,
    exceeded: spent > budget.limit,
  };
}
