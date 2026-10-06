import { budgetLevel } from '../../domain/budget';
import { addDays, addMonths, IsoDate, monthOf } from '../../domain/month';
import { ICategoryRepository } from '../ports/repositories';
import { GetBudgetStatuses } from './get-budget-statuses';
import { GetMonthRecurringExpenses } from './get-month-recurring-expenses';

export interface PaymentReminder {
  /** Único por fijo, mes y momento; sirve de id estable de la notificación. */
  key: string;
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
 * del vencimiento, desde hoy) y los presupuestos del mes que están en aviso o pasados.
 */
export class GetNotificationPlan {
  constructor(
    private readonly recurring: GetMonthRecurringExpenses,
    private readonly budgets: GetBudgetStatuses,
    private readonly categories: ICategoryRepository,
  ) {}

  async execute(today: IsoDate): Promise<NotificationPlan> {
    const month = monthOf(today);
    const [current, next, statuses, categories] = await Promise.all([
      this.recurring.execute(month),
      this.recurring.execute(addMonths(month, 1)),
      this.budgets.execute(month),
      this.categories.list(),
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
          name: expense.name,
          amount: instance.amount,
          dueDate: instance.dueDate,
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
        name: names.get(budget.categoryId) ?? 'Categoría',
        level,
        spent: status.spent,
        limit: status.limit,
      });
    }

    return { reminders: reminders.sort((a, b) => a.date.localeCompare(b.date)), budgets };
  }
}
