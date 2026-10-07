import { isValidCents } from '../../domain/money';
import { Budget, budgetCategoryIds } from '../../domain/budget';
import { isExpenseType } from '../../domain/category';
import { MonthKey } from '../../domain/month';
import { NotFoundError, ValidationError } from '../errors';
import { IBudgetRepository, ICategoryRepository, IdGenerator } from '../ports/repositories';

export interface SetBudgetInput {
  /** Una o más categorías de gasto que comparten el límite; la primera es la principal. */
  categoryIds?: string[];
  /** Forma de antes, con una sola categoría. */
  categoryId?: string;
  name?: string;
  month: MonthKey;
  limit: number;
  rollover?: boolean;
  /** Al editar, el presupuesto que se cambia. */
  id?: string;
}

/**
 * Crea o cambia un presupuesto del mes. Sin `id`, si ya hay uno con la misma categoría principal se actualiza ese.
 * Una categoría solo puede estar en un presupuesto por mes, para que su gasto no cuente dos veces.
 */
export class SetBudget {
  constructor(
    private readonly budgets: IBudgetRepository,
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: SetBudgetInput): Promise<Budget> {
    if (!isValidCents(input.limit)) throw new ValidationError('El límite debe ser mayor que cero');
    const categoryIds = [...new Set(input.categoryIds ?? (input.categoryId ? [input.categoryId] : []))];
    if (categoryIds.length === 0) throw new ValidationError('Elige al menos una categoría');
    for (const id of categoryIds) {
      const category = await this.categories.get(id);
      if (!category) throw new NotFoundError('Categoría');
      if (!isExpenseType(category.type)) throw new ValidationError('Solo se presupuestan categorías de gasto');
    }

    const month = await this.budgets.listByMonth(input.month);
    const existing = input.id ? month.find((b) => b.id === input.id) : month.find((b) => b.categoryId === categoryIds[0]);
    if (input.id && !existing) throw new NotFoundError('Presupuesto');
    const others = month.filter((b) => b.id !== existing?.id);
    const used = new Map(others.flatMap((b) => budgetCategoryIds(b).map((id) => [id, b] as const)));
    for (const id of categoryIds) {
      if (used.has(id)) {
        const name = (await this.categories.get(id))?.name ?? 'Una categoría';
        throw new ValidationError(`${name} ya está en otro presupuesto de este mes`);
      }
    }

    const budget: Budget = {
      id: existing?.id ?? this.ids.next(),
      categoryId: categoryIds[0],
      extraCategoryIds: categoryIds.slice(1),
      name: input.name?.trim() || undefined,
      month: input.month,
      limit: input.limit,
      rollover: !!input.rollover,
    };
    await this.budgets.save(budget);
    return budget;
  }
}
