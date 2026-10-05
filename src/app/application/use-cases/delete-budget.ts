import { IBudgetRepository } from '../ports/repositories';

export class DeleteBudget {
  constructor(private readonly budgets: IBudgetRepository) {}

  async execute(id: string): Promise<void> {
    await this.budgets.delete(id);
  }
}
