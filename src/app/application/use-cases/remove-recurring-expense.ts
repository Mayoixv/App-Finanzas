import { MonthKey } from '../../domain/month';
import { createInstance } from '../../domain/recurring-expense';
import { NotFoundError } from '../errors';
import { IRecurringExpenseRepository } from '../ports/repositories';

/** 'month': solo ese mes. 'forward': ese mes y los siguientes. */
export type RemoveScope = 'month' | 'forward';

/**
 * 'skipped': se quitó solo ese mes. 'deleted': no quedaba historial y se borró el fijo.
 * 'ended': el fijo deja de aparecer, pero se conservan los meses anteriores ya pagados.
 */
export type RemoveResult = 'skipped' | 'deleted' | 'ended';

export class RemoveRecurringExpense {
  constructor(private readonly recurring: IRecurringExpenseRepository) {}

  /**
   * Quita un fijo. Los pagos registrados siguen en Movimientos en cualquier caso.
   * - Solo este mes: ese mes queda omitido (no aparece ni avisa) y el fijo sigue los meses siguientes.
   * - Este y los siguientes: se quitan ese mes y los siguientes (aunque estuvieran pagados) y los meses anteriores
   *   que nunca se pagaron; solo quedan los meses anteriores pagados, como historial.
   */
  async execute(id: string, fromMonth: MonthKey, scope: RemoveScope = 'forward'): Promise<RemoveResult> {
    const expense = await this.recurring.get(id);
    if (!expense) throw new NotFoundError('fixed');

    if (scope === 'month') {
      const current = (await this.recurring.listInstancesOf(id)).find((i) => i.month === fromMonth);
      await this.recurring.saveInstance({ ...(current ?? createInstance(expense, fromMonth)), status: 'omitido', transactionId: undefined });
      return 'skipped';
    }

    let kept = 0;
    for (const instance of await this.recurring.listInstancesOf(id)) {
      if (instance.month < fromMonth && instance.status === 'pagado') kept++;
      else await this.recurring.deleteInstance(id, instance.month);
    }

    if (kept === 0) {
      await this.recurring.delete(id);
      return 'deleted';
    }
    await this.recurring.save({ ...expense, active: false });
    return 'ended';
  }
}
