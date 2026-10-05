import { isValidCents } from '../../domain/money';
import { Budget } from '../../domain/budget';
import { isExpenseType } from '../../domain/category';
import { MonthKey } from '../../domain/month';
import { NotFoundError, ValidationError } from '../errors';
import { IBudgetRepository, ICategoryRepository, IdGenerator } from '../ports/repositories';

export interface SetBudgetInput {
  categoryId: string;
  month: MonthKey;
  limit: number;
  rollover?: boolean;
}

/** Crea el presupuesto de una categoría en el mes, o cambia su límite si ya existe (hay uno por categoría y mes). */
export class SetBudget {
  constructor(
    private readonly budgets: IBudgetRepository,
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: SetBudgetInput): Promise<Budget> {
    if (!isValidCents(input.limit)) throw new ValidationError('El límite debe ser mayor que cero');
    const category = await this.categories.get(input.categoryId);
    if (!category) throw new NotFoundError('Categoría');
    if (!isExpenseType(category.type)) throw new ValidationError('Solo se presupuestan categorías de gasto');

    const existing = (await this.budgets.listByMonth(input.month)).find(
      (b) => b.categoryId === input.categoryId,
    );
    const budget: Budget = {
      id: existing?.id ?? this.ids.next(),
      categoryId: input.categoryId,
      month: input.month,
      limit: input.limit,
      rollover: !!input.rollover,
    };
    await this.budgets.save(budget);
    return budget;
  }
}
