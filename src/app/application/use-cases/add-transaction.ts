import { isValidCents } from '../../domain/money';
import { isValidIsoDate } from '../../domain/month';
import { Transaction } from '../../domain/transaction';
import { NotFoundError, ValidationError } from '../errors';
import {
  ICategoryRepository,
  IdGenerator,
  ITransactionRepository,
} from '../ports/repositories';

export interface AddTransactionInput {
  date: string;
  amount: number;
  categoryId: string;
  note?: string;
}

/** Reglas comunes al crear y al editar un movimiento. */
export async function validateTransactionInput(
  input: AddTransactionInput,
  categories: ICategoryRepository,
): Promise<void> {
  if (!isValidCents(input.amount)) throw new ValidationError('El monto debe ser mayor que cero');
  if (!isValidIsoDate(input.date)) throw new ValidationError('Fecha inválida');
  if (!(await categories.get(input.categoryId))) throw new NotFoundError('Categoría');
}

export class AddTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: AddTransactionInput): Promise<Transaction> {
    await validateTransactionInput(input, this.categories);

    const transaction: Transaction = {
      id: this.ids.next(),
      date: input.date,
      amount: input.amount,
      categoryId: input.categoryId,
      note: input.note?.trim() ?? '',
    };
    await this.transactions.save(transaction);
    return transaction;
  }
}
