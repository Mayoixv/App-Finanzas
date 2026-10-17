import { Affordability, canAfford } from '../../domain/affordability';
import { Cents } from '../../domain/money';
import { IsoDate, monthOf } from '../../domain/month';
import { ICategoryRepository } from '../ports/repositories';
import { GetAccountsOverview } from './accounts';
import { GetMonthHistory } from './get-month-history';
import { GetMonthRecurringExpenses } from './get-month-recurring-expenses';

/** Dos respuestas: con el dinero del mes (lo que entró menos lo que salió y se ahorró) y con todo el patrimonio. */
export interface AffordAnswer {
  month: Affordability;
  total: Affordability;
}

/** "¿Me alcanza?" con los datos de hoy: dinero del mes y patrimonio, menos los fijos pendientes del mes. */
export class CanAfford {
  constructor(
    private readonly history: GetMonthHistory,
    private readonly accounts: GetAccountsOverview,
    private readonly monthItems: GetMonthRecurringExpenses,
    private readonly categories: ICategoryRepository,
  ) {}

  async execute(amount: Cents, today: IsoDate): Promise<AffordAnswer> {
    const [[summary], overview, items, categories] = await Promise.all([
      this.history.execute(monthOf(today), 1),
      this.accounts.execute(),
      this.monthItems.execute(monthOf(today)),
      this.categories.list(),
    ]);
    const income = new Set(categories.filter((c) => c.type === 'ingreso').map((c) => c.id));
    const pending = items.filter((i) => i.instance.status === 'pendiente');
    const out = pending.filter((i) => !income.has(i.expense.categoryId)).reduce((s, i) => s + i.instance.amount, 0);
    const incomes = pending
      .filter((i) => income.has(i.expense.categoryId))
      .map((i) => ({ date: i.instance.dueDate, amount: i.instance.amount }));
    return {
      month: canAfford(amount, summary.balance, out, incomes, today),
      total: canAfford(amount, overview.assets, out, incomes, today),
    };
  }
}
