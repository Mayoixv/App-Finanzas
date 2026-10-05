import { isValidCents } from '../../domain/money';
import { isValidIsoDate } from '../../domain/month';
import { SavingsContribution } from '../../domain/savings';
import { NotFoundError, ValidationError } from '../errors';
import { IdGenerator, ISavingsRepository } from '../ports/repositories';

export interface AddSavingsContributionInput {
  goalId: string;
  date: string;
  amount: number;
}

export class AddSavingsContribution {
  constructor(
    private readonly savings: ISavingsRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: AddSavingsContributionInput): Promise<SavingsContribution> {
    if (!isValidCents(input.amount)) throw new ValidationError('El monto debe ser mayor que cero');
    if (!isValidIsoDate(input.date)) throw new ValidationError('Fecha inválida');
    if (!(await this.savings.getGoal(input.goalId))) throw new NotFoundError('Meta de ahorro');

    const contribution: SavingsContribution = {
      id: this.ids.next(),
      goalId: input.goalId,
      date: input.date,
      amount: input.amount,
    };
    await this.savings.saveContribution(contribution);
    return contribution;
  }
}
