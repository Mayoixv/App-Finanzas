import { MonthKey } from '../../domain/month';
import { NotFoundError } from '../errors';
import { IRecurringExpenseRepository } from '../ports/repositories';

/** 'deleted': no quedaba historial y se borró. 'ended': se conservan los meses anteriores y lo ya pagado. */
export type RemoveResult = 'deleted' | 'ended';

export class RemoveRecurringExpense {
  constructor(private readonly recurring: IRecurringExpenseRepository) {}

  /** Quita el gasto fijo desde `fromMonth` en adelante. Nunca borra pagos ya registrados. */
  async execute(id: string, fromMonth: MonthKey): Promise<RemoveResult> {
    const expense = await this.recurring.get(id);
    if (!expense) throw new NotFoundError('Gasto fijo');

    let kept = 0;
    for (const instance of await this.recurring.listInstancesOf(id)) {
      if (instance.status === 'pendiente' && instance.month >= fromMonth) {
        await this.recurring.deleteInstance(id, instance.month);
      } else {
        kept++;
      }
    }

    if (kept === 0) {
      await this.recurring.delete(id);
      return 'deleted';
    }
    await this.recurring.save({ ...expense, active: false });
    return 'ended';
  }
}
