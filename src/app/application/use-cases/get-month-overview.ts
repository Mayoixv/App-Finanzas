import { Category } from '../../domain/category';
import { expenseBreakdown, ExpenseSlice } from '../../domain/expense-breakdown';
import { MonthKey } from '../../domain/month';
import { MonthlySummary, summarizeMonth } from '../../domain/monthly-summary';
import { Transaction } from '../../domain/transaction';
import {
  ICategoryRepository,
  ISavingsRepository,
  ITransactionRepository,
} from '../ports/repositories';

export interface RecentTransaction {
  transaction: Transaction;
  category: Category | undefined;
}

export interface MonthOverview {
  summary: MonthlySummary;
  breakdown: ExpenseSlice[];
  recent: RecentTransaction[];
}

/** Todo lo que necesita la pantalla de inicio, leyendo cada tabla una sola vez. */
export class GetMonthOverview {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly savings: ISavingsRepository,
  ) {}

  async execute(month: MonthKey, recentLimit = 5): Promise<MonthOverview> {
    const [transactions, categories, contributions] = await Promise.all([
      this.transactions.listByMonth(month),
      this.categories.list(),
      this.savings.listContributionsByMonth(month),
    ]);
    const byId = new Map(categories.map((c) => [c.id, c]));
    const recent = [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, recentLimit)
      .map((transaction) => ({ transaction, category: byId.get(transaction.categoryId) }));

    return {
      summary: summarizeMonth(month, transactions, categories, contributions),
      breakdown: expenseBreakdown(month, transactions, categories),
      recent,
    };
  }
}
