import { SavingsGoal } from '../../domain/savings';
import { NotFoundError } from '../errors';
import { ISavingsRepository } from '../ports/repositories';
import { SavingsGoalFields, validateGoalInput } from './add-savings-goal';

export class UpdateSavingsGoal {
  constructor(private readonly savings: ISavingsRepository) {}

  async execute(id: string, input: SavingsGoalFields): Promise<SavingsGoal> {
    if (!(await this.savings.getGoal(id))) throw new NotFoundError('goal');
    const goal: SavingsGoal = {
      id,
      name: validateGoalInput(input),
      targetAmount: input.targetAmount,
      targetDate: input.targetDate || null,
    };
    await this.savings.saveGoal(goal);
    return goal;
  }
}
