import { CASH_ACCOUNT_ID } from '../../domain/account';
import { isExpenseType } from '../../domain/category';
import { isValidCents } from '../../domain/money';
import { isValidIsoDate } from '../../domain/month';
import { normalizeTags, Transaction, TransactionSplit } from '../../domain/transaction';
import { NotFoundError, ValidationError } from '../errors';
import {
  IAccountRepository,
  ICategoryRepository,
  IdGenerator,
  ITransactionRepository,
} from '../ports/repositories';

export interface AddTransactionInput {
  date: string;
  amount: number;
  categoryId: string;
  note?: string;
  tags?: string[];
  /** Al menos dos partes que sumen el monto, todas del mismo tipo (gasto o ingreso) que la categoría. */
  splits?: TransactionSplit[];
  /** Sin valor, Efectivo (o la que ya tenía, al editar). */
  accountId?: string;
}

/** Reglas comunes al crear y al editar un movimiento. */
export async function validateTransactionInput(
  input: AddTransactionInput,
  categories: ICategoryRepository,
): Promise<void> {
  if (!isValidCents(input.amount)) throw new ValidationError('El monto debe ser mayor que cero');
  if (!isValidIsoDate(input.date)) throw new ValidationError('Fecha inválida');
  const main = await categories.get(input.categoryId);
  if (!main) throw new NotFoundError('Categoría');

  const splits = input.splits ?? [];
  if (splits.length === 0) return;
  if (splits.length < 2) throw new ValidationError('Para dividir hacen falta al menos dos categorías');
  if (new Set(splits.map((s) => s.categoryId)).size !== splits.length) {
    throw new ValidationError('Cada parte debe tener una categoría distinta');
  }
  if (!splits.every((s) => isValidCents(s.amount))) throw new ValidationError('Cada parte debe ser mayor que cero');
  if (splits.reduce((sum, s) => sum + s.amount, 0) !== input.amount) {
    throw new ValidationError('Las partes deben sumar el monto total');
  }
  for (const s of splits) {
    const category = await categories.get(s.categoryId);
    if (!category) throw new NotFoundError('Categoría');
    if (isExpenseType(category.type) !== isExpenseType(main.type)) {
      throw new ValidationError('Todas las partes deben ser del mismo tipo (gasto o ingreso)');
    }
  }
}

/** Arma el movimiento a guardar: etiquetas limpias y, si está dividido, la parte mayor como categoría visible. */
export function buildTransaction(id: string, input: AddTransactionInput): Transaction {
  const splits = [...(input.splits ?? [])].sort((a, b) => b.amount - a.amount);
  return {
    id,
    date: input.date,
    amount: input.amount,
    categoryId: splits[0]?.categoryId ?? input.categoryId,
    note: input.note?.trim() ?? '',
    tags: normalizeTags(input.tags ?? []),
    splits,
    accountId: input.accountId ?? CASH_ACCOUNT_ID,
  };
}

/** La cuenta debe existir; en un movimiento nuevo, además, no estar archivada. */
export async function validateAccount(
  accountId: string | undefined,
  accounts: IAccountRepository | undefined,
  allowArchived: boolean,
): Promise<void> {
  if (!accountId || !accounts) return;
  const account = await accounts.get(accountId);
  if (!account) throw new NotFoundError('Cuenta');
  if (account.archived && !allowArchived) throw new ValidationError('Esa cuenta está archivada; elige otra');
}

export class AddTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
    private readonly accounts?: IAccountRepository,
  ) {}

  async execute(input: AddTransactionInput): Promise<Transaction> {
    await validateTransactionInput(input, this.categories);
    await validateAccount(input.accountId, this.accounts, false);
    const transaction = buildTransaction(this.ids.next(), input);
    await this.transactions.save(transaction);
    return transaction;
  }
}
