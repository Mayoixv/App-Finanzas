import { budgetCategoryIds } from '../../domain/budget';
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
    const taken = new Set(target.flatMap(budgetCategoryIds));
    let copied = 0;
    for (const b of source) {
      // Si alguna de sus categorías ya tiene presupuesto en el mes destino, se deja: no se cuenta dos veces.
      if (budgetCategoryIds(b).some((id) => taken.has(id))) continue;
      await this.budgets.save({ ...b, id: this.ids.next(), month: toMonth });
      budgetCategoryIds(b).forEach((id) => taken.add(id));
      copied++;
    }
    return copied;
  }
}
