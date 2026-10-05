import { addDays, IsoDate, monthOf } from '../../domain/month';
import { GetMonthRecurringExpenses, MonthRecurringExpense } from './get-month-recurring-expenses';

/** Fijos pendientes que vencen de hoy a `days` días, más los vencidos del mes en curso. */
export class GetUpcomingRecurring {
  constructor(private readonly monthItems: GetMonthRecurringExpenses) {}

  async execute(today: IsoDate, days = 7): Promise<MonthRecurringExpense[]> {
    const limit = addDays(today, days);
    const months = [...new Set([monthOf(today), monthOf(limit)])];
    const items = (await Promise.all(months.map((m) => this.monthItems.execute(m)))).flat();
    return items
      .filter(
        (i) =>
          i.instance.status === 'pendiente' &&
          i.instance.dueDate <= limit &&
          (i.instance.dueDate >= today || i.instance.month === monthOf(today)),
      )
      .sort((a, b) => a.instance.dueDate.localeCompare(b.instance.dueDate));
  }
}
