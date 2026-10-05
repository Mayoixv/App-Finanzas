import { addMonths, MonthKey } from '../../domain/month';
import { NotFoundError, ValidationError } from '../errors';
import { IRecurringExpenseRepository } from '../ports/repositories';

export class PauseRecurringExpense {
  constructor(private readonly recurring: IRecurringExpenseRepository) {}

  /** Pausa `months` meses desde `fromMonth` (inclusive) y quita lo pendiente de esos meses. Lo pagado se queda. */
  async execute(id: string, fromMonth: MonthKey, months: number): Promise<MonthKey> {
    if (!Number.isInteger(months) || months < 1 || months > 24) throw new ValidationError('Pausa de 1 a 24 meses');
    const expense = await this.recurring.get(id);
    if (!expense) throw new NotFoundError('Fijo');
    const pausedUntil = addMonths(fromMonth, months - 1);
    await this.recurring.save({ ...expense, pausedUntil });
    for (const i of await this.recurring.listInstancesOf(id)) {
      if (i.status === 'pendiente' && i.month >= fromMonth && i.month <= pausedUntil) {
        await this.recurring.deleteInstance(id, i.month);
      }
    }
    return pausedUntil;
  }
}

export class ResumeRecurringExpense {
  constructor(private readonly recurring: IRecurringExpenseRepository) {}

  async execute(id: string): Promise<void> {
    const expense = await this.recurring.get(id);
    if (!expense) throw new NotFoundError('Fijo');
    await this.recurring.save({ ...expense, pausedUntil: null });
  }
}
