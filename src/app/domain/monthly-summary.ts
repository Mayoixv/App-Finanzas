import { Category, isExpenseType } from './category';
import { monthOf, MonthKey } from './month';
import { SavingsContribution } from './savings';
import { Transaction } from './transaction';

export type SavingsRating = 'excelente' | 'regular' | 'bajo';

export interface MonthlySummary {
  month: MonthKey;
  income: number;
  expenses: number;
  saved: number;
  balance: number;
  /** Ahorrado / ingresos, en porcentaje; 0 si no hubo ingresos. */
  savingsPercent: number;
  rating: SavingsRating;
}

export function rateSavings(percent: number): SavingsRating {
  if (percent >= 20) return 'excelente';
  if (percent >= 10) return 'regular';
  return 'bajo';
}

export function summarizeMonth(
  month: MonthKey,
  transactions: Transaction[],
  categories: Category[],
  contributions: SavingsContribution[],
): MonthlySummary {
  const typeById = new Map(categories.map((c) => [c.id, c.type]));
  let income = 0;
  let expenses = 0;

  for (const t of transactions) {
    if (monthOf(t.date) !== month) continue;
    const type = typeById.get(t.categoryId);
    if (type === 'ingreso') income += t.amount;
    else if (type && isExpenseType(type)) expenses += t.amount;
  }

  const saved = contributions
    .filter((c) => monthOf(c.date) === month)
    .reduce((sum, c) => sum + c.amount, 0);

  const savingsPercent = income > 0 ? (saved / income) * 100 : 0;

  return {
    month,
    income,
    expenses,
    saved,
    balance: income - expenses - saved,
    savingsPercent,
    rating: rateSavings(savingsPercent),
  };
}
