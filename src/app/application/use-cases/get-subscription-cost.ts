import { MonthKey } from '../../domain/month';
import { isRunningIn } from '../../domain/recurring-expense';
import { ICategoryRepository, IRecurringExpenseRepository } from '../ports/repositories';

export interface SubscriptionCost {
  count: number;
  /** Costo mensual equivalente: un pago anual cuenta 1/12 por mes, uno trimestral 1/3. */
  monthly: number;
  yearly: number;
}

const isSubscriptionCategory = (c: { id: string; name: string }) =>
  c.id === 'cat-suscripciones' || c.name.trim().toLocaleLowerCase('es') === 'suscripciones';

/** Cuánto se va en suscripciones (fijos de la categoría Suscripciones activos y no pausados en `month`). */
export class GetSubscriptionCost {
  constructor(
    private readonly recurring: IRecurringExpenseRepository,
    private readonly categories: ICategoryRepository,
  ) {}

  async execute(month: MonthKey): Promise<SubscriptionCost> {
    const [expenses, categories] = await Promise.all([this.recurring.list(), this.categories.list()]);
    const ids = new Set(categories.filter(isSubscriptionCategory).map((c) => c.id));
    const subs = expenses.filter((e) => e.active && ids.has(e.categoryId) && isRunningIn(e, month));
    const monthly = Math.round(subs.reduce((s, e) => s + e.amount / (e.frequency ?? 1), 0));
    return { count: subs.length, monthly, yearly: Math.round(subs.reduce((s, e) => s + (e.amount * 12) / (e.frequency ?? 1), 0)) };
  }
}
