import { isValidCents } from '../../domain/money';
import { MonthKey } from '../../domain/month';
import { RecurringExpense } from '../../domain/recurring-expense';
import { NotFoundError, ValidationError } from '../errors';
import {
  ICategoryRepository,
  IdGenerator,
  IRecurringExpenseRepository,
} from '../ports/repositories';

export interface RecurringExpenseFields {
  name: string;
  amount: number;
  categoryId: string;
  dueDay: number;
}

/** Reglas comunes al crear y al editar un gasto fijo. Devuelve el nombre ya recortado. */
export async function validateRecurringInput(
  input: RecurringExpenseFields,
  categories: ICategoryRepository,
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Escribe un nombre para el gasto fijo');
  if (!isValidCents(input.amount)) throw new ValidationError('El monto debe ser mayor que cero');
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    throw new ValidationError('El día de vencimiento debe estar entre 1 y 31');
  }
  const category = await categories.get(input.categoryId);
  if (!category) throw new NotFoundError('Categoría');
  if (category.type !== 'fijo') throw new ValidationError('Elige una categoría de gasto fijo');
  return name;
}

export interface AddRecurringExpenseInput {
  name: string;
  amount: number;
  categoryId: string;
  dueDay: number;
  /** Mes desde el que empieza a aplicar. */
  startMonth: MonthKey;
}

export class AddRecurringExpense {
  constructor(
    private readonly recurring: IRecurringExpenseRepository,
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: AddRecurringExpenseInput): Promise<RecurringExpense> {
    const name = await validateRecurringInput(input, this.categories);

    const expense: RecurringExpense = {
      id: this.ids.next(),
      name,
      amount: input.amount,
      categoryId: input.categoryId,
      dueDay: input.dueDay,
      active: true,
      startMonth: input.startMonth,
    };
    await this.recurring.save(expense);
    return expense;
  }
}
