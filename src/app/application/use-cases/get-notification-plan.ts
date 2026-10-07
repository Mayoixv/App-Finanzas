import { budgetLevel, budgetName } from '../../domain/budget';
import { addDays, addMonths, IsoDate, monthOf } from '../../domain/month';
import { ICategoryRepository } from '../ports/repositories';
import { GetCardStatuses } from './accounts';
import { GetBudgetStatuses } from './get-budget-statuses';
import { GetMonthRecurringExpenses } from './get-month-recurring-expenses';

export interface PaymentReminder {
  /** Único por fijo, mes y momento; sirve de id estable de la notificación. */
  key: string;
  /** Un gasto fijo o el pago del estado de una tarjeta. */
  kind: 'fijo' | 'tarjeta';
  /** Solo tarjetas: pago mínimo anotado para ese estado. */
  minimum?: number | null;
  name: string;
  amount: number;
  dueDate: IsoDate;
  /** El día anterior o el mismo día del vencimiento. */
  when: 'antes' | 'hoy';
  /** Día en que se muestra. */
  date: IsoDate;
}

export interface BudgetNotice {
  /** Único por categoría, mes y umbral: se avisa una sola vez. */
  key: string;
  name: string;
  level: 'warning' | 'exceeded';
  spent: number;
  limit: number;
}

export interface NotificationPlan {
  reminders: PaymentReminder[];
  budgets: BudgetNotice[];
}

/**
 * Qué notificar: recordatorios de los gastos fijos pendientes de este mes y el siguiente (el día anterior y el día
 * del vencimiento, desde hoy), los pagos pendientes de tarjetas y los presupuestos del mes en aviso o pasados.
 */
export class GetNotificationPlan {
  constructor(
    private readonly recurring: GetMonthRecurringExpenses,
    private readonly budgets: GetBudgetStatuses,
    private readonly categories: ICategoryRepository,
    private readonly cards: GetCardStatuses,
  ) {}

  async execute(today: IsoDate): Promise<NotificationPlan> {
    const month = monthOf(today);
    const [current, next, statuses, categories, cards] = await Promise.all([
      this.recurring.execute(month),
      this.recurring.execute(addMonths(month, 1)),
      this.budgets.execute(month),
      this.categories.list(),
      this.cards.execute(today),
    ]);
    const types = new Map(categories.map((c) => [c.id, c.type]));
    const names = new Map(categories.map((c) => [c.id, c.name]));

    const reminders: PaymentReminder[] = [];
    for (const { expense, instance } of [...current, ...next]) {
      // Un ingreso fijo sin cobrar no es un pago que recordar.
      if (instance.status !== 'pendiente' || types.get(expense.categoryId) === 'ingreso') continue;
      const moments: [PaymentReminder['when'], IsoDate][] = [
        ['antes', addDays(instance.dueDate, -1)],
        ['hoy', instance.dueDate],
      ];
      for (const [when, date] of moments) {
        if (date < today) continue;
        reminders.push({
          key: `fijo:${expense.id}:${instance.month}:${when}`,
          kind: 'fijo',
          name: expense.name,
          amount: instance.amount,
          dueDate: instance.dueDate,
          when,
          date,
        });
      }
    }

    // Tarjetas: el día antes y el día del pago, si queda algo del estado por pagar.
    for (const c of cards) {
      if (c.pending <= 0) continue;
      const moments: [PaymentReminder['when'], IsoDate][] = [
        ['antes', addDays(c.dueDate, -1)],
        ['hoy', c.dueDate],
      ];
      for (const [when, date] of moments) {
        if (date < today) continue;
        reminders.push({
          key: `tarjeta:${c.account.id}:${c.dueDate}:${when}`,
          kind: 'tarjeta',
          minimum: c.minimum,
          name: `el pago de ${c.account.name}`,
          amount: c.pending,
          dueDate: c.dueDate,
          when,
          date,
        });
      }
    }

    const budgets: BudgetNotice[] = [];
    for (const { budget, status } of statuses) {
      const level = budgetLevel(status);
      if (level === 'ok') continue;
      budgets.push({
        key: `presupuesto:${budget.categoryId}:${month}:${level}`,
        name: budgetName(budget, names),
        level,
        spent: status.spent,
        limit: status.limit,
      });
    }

    return { reminders: reminders.sort((a, b) => a.date.localeCompare(b.date)), budgets };
  }
}
