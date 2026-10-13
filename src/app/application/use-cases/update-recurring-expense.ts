import { dateInMonth, MonthKey } from '../../domain/month';
import { isDueIn, RecurringExpense } from '../../domain/recurring-expense';
import { NotFoundError } from '../errors';
import { ICategoryRepository, IRecurringExpenseRepository } from '../ports/repositories';
import { RecurringExpenseFields, validateRecurringInput } from './add-recurring-expense';

export class UpdateRecurringExpense {
  constructor(
    private readonly recurring: IRecurringExpenseRepository,
    private readonly categories: ICategoryRepository,
  ) {}

  /**
   * Cambia la plantilla y ajusta monto y vencimiento de lo que siga pendiente desde `fromMonth`.
   * Los meses anteriores y los ya pagados no se tocan: reflejan lo que de verdad pasó.
   */
  async execute(
    id: string,
    input: RecurringExpenseFields,
    fromMonth: MonthKey,
  ): Promise<RecurringExpense> {
    const current = await this.recurring.get(id);
    if (!current) throw new NotFoundError('fixed');
    const name = await validateRecurringInput(input, this.categories);

    const updated: RecurringExpense = {
      ...current,
      name,
      amount: input.amount,
      categoryId: input.categoryId,
      dueDay: input.dueDay,
      frequency: input.frequency ?? current.frequency ?? 1,
      accountId: input.accountId !== undefined ? input.accountId : (current.accountId ?? null),
    };
    await this.recurring.save(updated);

    for (const instance of await this.recurring.listInstancesOf(id)) {
      if (instance.status !== 'pendiente' || instance.month < fromMonth) continue;
      // Si con la frecuencia nueva ese mes ya no toca, su pendiente sobra.
      if (!isDueIn(updated, instance.month)) {
        await this.recurring.deleteInstance(id, instance.month);
        continue;
      }
      await this.recurring.saveInstance({
        ...instance,
        amount: updated.amount,
        dueDate: dateInMonth(instance.month, updated.dueDay),
      });
    }
    return updated;
  }
}
