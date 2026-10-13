import { NotFoundError } from '../errors';
import { ISavingsRepository } from '../ports/repositories';

export class DeleteSavingsGoal {
  constructor(private readonly savings: ISavingsRepository) {}

  /** Borra la meta y sus aportes (la base los borra en cascada); dejan de contar como ahorrado. */
  async execute(id: string): Promise<void> {
    if (!(await this.savings.getGoal(id))) throw new NotFoundError('goal');
    await this.savings.deleteGoal(id);
  }
}
