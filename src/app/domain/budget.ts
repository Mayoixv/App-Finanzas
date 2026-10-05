import { MonthKey } from './month';

export interface Budget {
  id: string;
  categoryId: string;
  month: MonthKey;
  limit: number;
  /** Lo que sobre (o falte) pasa al mes siguiente si ese mes también tiene rollover. */
  rollover?: boolean;
}

export interface BudgetStatus {
  /** Límite del mes más lo que arrastra del anterior. */
  limit: number;
  carry: number;
  spent: number;
  remaining: number;
  exceeded: boolean;
}

export function budgetStatus(budget: Budget, spent: number, carry = 0): BudgetStatus {
  const limit = budget.limit + carry;
  return { limit, carry, spent, remaining: limit - spent, exceeded: spent > limit };
}

/** Desde este porcentaje del límite el presupuesto pasa a aviso (ámbar). */
export const BUDGET_WARNING_PERCENT = 85;

export type BudgetLevel = 'ok' | 'warning' | 'exceeded';

export function budgetLevel(status: BudgetStatus): BudgetLevel {
  if (status.exceeded) return 'exceeded';
  const percent = status.limit > 0 ? (status.spent / status.limit) * 100 : status.spent > 0 ? 100 : 0;
  return percent >= BUDGET_WARNING_PERCENT ? 'warning' : 'ok';
}
