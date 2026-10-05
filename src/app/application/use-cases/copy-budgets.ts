import { MonthKey } from '../../domain/month';
import { IBudgetRepository, IdGenerator } from '../ports/repositories';

/** Copia los presupuestos de un mes a otro sin pisar los que el mes destino ya tenga. Devuelve cuántos copió. */
export class CopyBudgets {
  constructor(
    private readonly budgets: IBudgetRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(fromMonth: MonthKey, toMonth: MonthKey): Promise<number> {
    const [source, target] = await Promise.all([
      this.budgets.listByMonth(fromMonth),
      this.budgets.listByMonth(toMonth),
    ]);
    const taken = new Set(target.map((b) => b.categoryId));
    let copied = 0;
    for (const b of source) {
      if (taken.has(b.categoryId)) continue;
      await this.budgets.save({ id: this.ids.next(), categoryId: b.categoryId, month: toMonth, limit: b.limit });
      copied++;
    }
    return copied;
  }
}
