import { MonthKey } from '../../domain/month';
import {
  createInstance,
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
      if (hasInstance.has(expense.id) || !expense.active || month < expense.startMonth) continue;
      await this.recurring.insertInstanceIfMissing(createInstance(expense, month));
      created = true;
    }

    // Se relee tras crear: si otra lectura creó o pagó la instancia a la vez, manda lo que quedó guardado.
    const instances = created ? await this.recurring.listInstances(month) : existing;
    const byId = new Map(expenses.map((e) => [e.id, e]));
    const result: MonthRecurringExpense[] = [];
    for (const instance of instances) {
      const expense = byId.get(instance.recurringExpenseId);
      if (expense) result.push({ expense, instance });
    }
    return result.sort((a, b) => a.instance.dueDate.localeCompare(b.instance.dueDate));
  }
}
