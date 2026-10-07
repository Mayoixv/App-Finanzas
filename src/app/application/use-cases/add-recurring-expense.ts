import { isValidCents } from '../../domain/money';
import { MonthKey } from '../../domain/month';
import { FREQUENCIES, Frequency, RecurringExpense } from '../../domain/recurring-expense';
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
  frequency?: Frequency;
  accountId?: string | null;
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
  if (category.type === 'variable') throw new ValidationError('Elige una categoría de gasto fijo o de ingreso');
  if (input.frequency !== undefined && !FREQUENCIES.includes(input.frequency)) {
    throw new ValidationError('Frecuencia inválida');
  }
  return name;
}

export interface AddRecurringExpenseInput extends RecurringExpenseFields {
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
      frequency: input.frequency ?? 1,
      accountId: input.accountId ?? null,
    };
    await this.recurring.save(expense);
    return expense;
  }
}

/** Nombre de cada cobro cuando un ingreso se cobra varias veces al mes: "Sueldo · día 15", "Sueldo · fin de mes". */
export function paymentName(base: string, dueDay: number): string {
  return `${base.trim()} · ${dueDay === 31 ? 'fin de mes' : `día ${dueDay}`}`;
}

/**
 * Varios fijos de una vez (por ejemplo, un sueldo quincenal: un fijo por cobro, cada uno con su día y su monto).
 * Valida todos antes de guardar: si uno no es válido, no se guarda ninguno.
 */
export class AddRecurringExpenses {
  constructor(
    private readonly recurring: IRecurringExpenseRepository,
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(inputs: AddRecurringExpenseInput[]): Promise<RecurringExpense[]> {
    if (inputs.length === 0) throw new ValidationError('Agrega al menos un cobro');
    const days = inputs.map((i) => i.dueDay);
    if (new Set(days).size !== days.length) throw new ValidationError('Hay dos cobros el mismo día');
    for (const input of inputs) await validateRecurringInput(input, this.categories);
    const add = new AddRecurringExpense(this.recurring, this.categories, this.ids);
    const saved: RecurringExpense[] = [];
    for (const input of inputs) saved.push(await add.execute(input));
    return saved;
  }
}
