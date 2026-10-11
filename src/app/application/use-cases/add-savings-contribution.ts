import { isValidCents } from '../../domain/money';
import { isValidIsoDate } from '../../domain/month';
import { goalProgress, SavingsContribution } from '../../domain/savings';
import { NotFoundError, ValidationError } from '../errors';
import { IAccountRepository, IdGenerator, ISavingsRepository } from '../ports/repositories';

export interface AddSavingsContributionInput {
  goalId: string;
  date: string;
  amount: number;
  /** Sacar dinero de la meta en vez de aportar. */
  withdrawal?: boolean;
  /** Cuenta de donde sale (o a donde vuelve, si es retiro). */
  accountId?: string | null;
}

export class AddSavingsContribution {
  constructor(
    private readonly savings: ISavingsRepository,
    private readonly ids: IdGenerator,
    private readonly accounts?: IAccountRepository,
  ) {}

  async execute(input: AddSavingsContributionInput): Promise<SavingsContribution> {
    if (!isValidCents(input.amount)) throw new ValidationError('El monto debe ser mayor que cero');
    if (!isValidIsoDate(input.date)) throw new ValidationError('Fecha inválida');
    const goal = await this.savings.getGoal(input.goalId);
    if (!goal) throw new NotFoundError('Meta de ahorro');
    if (input.accountId && this.accounts && !(await this.accounts.get(input.accountId))) throw new NotFoundError('Cuenta');
    if (input.withdrawal) {
      const { saved } = goalProgress(goal, await this.savings.listContributions());
      if (input.amount > saved) throw new ValidationError('No puedes retirar más de lo ahorrado en esta meta');
    }

    const contribution: SavingsContribution = {
      id: this.ids.next(),
      goalId: input.goalId,
      date: input.date,
      amount: input.amount,
      withdrawal: !!input.withdrawal,
      accountId: input.accountId ?? null,
    };
    await this.savings.saveContribution(contribution);
    return contribution;
  }
}
