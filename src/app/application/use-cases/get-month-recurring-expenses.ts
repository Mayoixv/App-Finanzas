import { MonthKey } from '../../domain/month';
import {
  createInstance,
  isDueIn,
  isPausedIn,
  RecurringExpense,
  RecurringExpenseInstance,
} from '../../domain/recurring-expense';
import { IRecurringExpenseRepository } from '../ports/repositories';

export interface MonthRecurringExpense {
  expense: RecurringExpense;
  instance: RecurringExpenseInstance;
}

/** Devuelve los gastos fijos del mes; crea como pendientes las instancias que faltan desde su mes de inicio. */
export class GetMonthRecurringExpenses {
  constructor(private readonly recurring: IRecurringExpenseRepository) {}

  async execute(month: MonthKey): Promise<MonthRecurringExpense[]> {
    const [expenses, existing] = await Promise.all([
      this.recurring.list(),
      this.recurring.listInstances(month),
    ]);
    const hasInstance = new Set(existing.map((i) => i.recurringExpenseId));

    let created = false;
    for (const expense of expenses) {
      if (hasInstance.has(expense.id) || !expense.active || !isDueIn(expense, month)) continue;
      await this.recurring.insertInstanceIfMissing(createInstance(expense, month));
      created = true;
    }

    // Se relee tras crear: si otra lectura creó o pagó la instancia a la vez, manda lo que quedó guardado.
    const instances = created ? await this.recurring.listInstances(month) : existing;
    const byId = new Map(expenses.map((e) => [e.id, e]));
    const result: MonthRecurringExpense[] = [];
    for (const instance of instances) {
      const expense = byId.get(instance.recurringExpenseId);
      if (expense && instance.status !== 'omitido') result.push({ expense, instance });
    }
    return result.sort((a, b) => a.instance.dueDate.localeCompare(b.instance.dueDate));
  }

  /** Si hay algún fijo activo, aunque no toque ese mes (para el mensaje cuando el mes está vacío). */
  async hasActive(): Promise<boolean> {
    return (await this.recurring.list()).some((e) => e.active);
  }

  /** Plantillas activas en pausa ese mes, para poder reanudarlas aunque no tengan instancia. */
  async pausedIn(month: MonthKey): Promise<RecurringExpense[]> {
    return (await this.recurring.list()).filter(
      (e) => e.active && isPausedIn(e, month),
    );
  }
}
