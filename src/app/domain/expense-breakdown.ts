import { Category, isExpenseType } from './category';
import { MonthKey, monthOf } from './month';
import { expandSplits, Transaction } from './transaction';

export interface ExpenseSlice {
  categoryId: string;
  name: string;
  amount: number;
  /** Porcentaje del gasto total del mes. */
  percent: number;
}

/** Gasto del mes por categoría, de mayor a menor. Ignora ingresos y categorías desconocidas. */
export function expenseBreakdown(
  month: MonthKey,
  transactions: Transaction[],
  categories: Category[],
): ExpenseSlice[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();

  for (const t of expandSplits(transactions)) {
    if (monthOf(t.date) !== month) continue;
    const category = byId.get(t.categoryId);
    if (!category || !isExpenseType(category.type)) continue;
    totals.set(category.id, (totals.get(category.id) ?? 0) + t.amount);
  }

  const total = [...totals.values()].reduce((sum, v) => sum + v, 0);
  return [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: byId.get(categoryId)!.name,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
