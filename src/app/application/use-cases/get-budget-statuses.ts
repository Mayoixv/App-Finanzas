import { Budget, budgetStatus, BudgetStatus } from '../../domain/budget';
import { MonthKey } from '../../domain/month';
import { IBudgetRepository, ITransactionRepository } from '../ports/repositories';

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
    const [budgets, transactions] = await Promise.all([
      this.budgets.listByMonth(month),
      this.transactions.listByMonth(month),
    ]);
    const spentByCategory = new Map<string, number>();
    for (const t of transactions) {
      spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount);
    }
    return budgets.map((budget) => ({
      budget,
      status: budgetStatus(budget, spentByCategory.get(budget.categoryId) ?? 0),
    }));
  }
}
