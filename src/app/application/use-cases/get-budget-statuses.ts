import { Budget, budgetStatus, BudgetStatus } from '../../domain/budget';
import { addMonths, MonthKey } from '../../domain/month';
import { expandSplits } from '../../domain/transaction';
import { IBudgetRepository, ITransactionRepository } from '../ports/repositories';

/** Hasta cuántos meses hacia atrás se encadena el rollover. */
const MAX_CARRY_MONTHS = 12;

export interface BudgetWithStatus {
  budget: Budget;
  status: BudgetStatus;
}

export class GetBudgetStatuses {
  constructor(
    private readonly budgets: IBudgetRepository,
    private readonly transactions: ITransactionRepository,
  ) {}

  async execute(month: MonthKey): Promise<BudgetWithStatus[]> {
    const budgets = await this.budgets.listByMonth(month);
    const spent = await this.spentByCategory(month);
    const result: BudgetWithStatus[] = [];
    for (const budget of budgets) {
      const carry = budget.rollover ? await this.leftover(budget.categoryId, addMonths(month, -1), MAX_CARRY_MONTHS) : 0;
      result.push({ budget, status: budgetStatus(budget, spent.get(budget.categoryId) ?? 0, carry) });
    }
    return result;
  }

  /** Lo que sobró (o faltó) de esa categoría en ese mes, contando su propio arrastre, si tenía rollover. */
  private async leftover(categoryId: string, month: MonthKey, depth: number): Promise<number> {
    if (depth === 0) return 0;
    const budget = (await this.budgets.listByMonth(month)).find((b) => b.categoryId === categoryId);
    if (!budget?.rollover) return 0;
    const carry = await this.leftover(categoryId, addMonths(month, -1), depth - 1);
    return budget.limit + carry - ((await this.spentByCategory(month)).get(categoryId) ?? 0);
  }

  private async spentByCategory(month: MonthKey): Promise<Map<string, number>> {
    const spent = new Map<string, number>();
    for (const t of expandSplits(await this.transactions.listByMonth(month))) {
      spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amount);
    }
    return spent;
  }
}
