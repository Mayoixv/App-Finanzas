import { isExpenseType } from '../../domain/category';
import { Cents } from '../../domain/money';
import { dateInMonth, IsoDate, MonthKey } from '../../domain/month';
import { Transaction } from '../../domain/transaction';
import { NotFoundError, ValidationError } from '../errors';
import { ICategoryRepository, IDebtRepository, IRecurringExpenseRepository, ITransactionRepository } from '../ports/repositories';
import { AddTransaction } from './add-transaction';

export interface CopyCandidate {
  transaction: Transaction;
  income: boolean;
  /** Pago de un fijo o de una deuda: no se copia, porque Fijos ya lo crea cada mes. */
  fromFixed: boolean;
}

export interface CopyItem {
  transactionId: string;
  amount: Cents;
  /** Cuenta para la copia; sin valor, la del original. */
  accountId?: string;
}

/** El mismo día en el mes destino; si no existe (31 en un mes de 30), el último día del mes. */
export function moveToMonth(date: IsoDate, month: MonthKey): IsoDate {
  return dateInMonth(month, Number(date.slice(8, 10)));
}

/** "Copiar de otro mes": movimientos nuevos en el mes destino a partir de los de otro mes, sin tocar el original. */
export class CopyFromMonth {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly recurring: IRecurringExpenseRepository,
    private readonly debts: IDebtRepository,
    private readonly add: AddTransaction,
  ) {}

  /** Los movimientos del mes de origen, por fecha, marcando los que no se copian. */
  async candidates(from: MonthKey): Promise<CopyCandidate[]> {
    const [transactions, categories, instances, payments] = await Promise.all([
      this.transactions.listByMonth(from),
      this.categories.list(),
      this.recurring.listInstances(from),
      this.debts.listPayments(),
    ]);
    const types = new Map(categories.map((c) => [c.id, c.type]));
    const fixed = new Set([...instances.map((i) => i.transactionId), ...payments.map((p) => p.transactionId)]);
    return [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((transaction) => ({
        transaction,
        income: !isExpenseType(types.get(transaction.categoryId) ?? 'variable'),
        fromFixed: fixed.has(transaction.id),
      }));
  }

  /** Crea las copias; si una falla, se borran las ya creadas y no queda nada a medias. Devuelve las nuevas. */
  async execute(from: MonthKey, to: MonthKey, items: CopyItem[]): Promise<Transaction[]> {
    if (from === to) throw new ValidationError('copySameMonth');
    const candidates = new Map((await this.candidates(from)).map((c) => [c.transaction.id, c]));
    const created: Transaction[] = [];
    try {
      for (const item of items) {
        const candidate = candidates.get(item.transactionId);
        if (!candidate) throw new NotFoundError('transaction');
        if (candidate.fromFixed) throw new ValidationError('copyFixed');
        const original = candidate.transaction;
        // Un movimiento dividido solo se copia con sus partes si el monto no cambió (si no, ya no sumarían).
        const splits = item.amount === original.amount ? original.splits : [];
        created.push(
          await this.add.execute({
            date: moveToMonth(original.date, to),
            amount: item.amount,
            categoryId: original.categoryId,
            note: original.note,
            tags: original.tags,
            splits,
            accountId: item.accountId ?? original.accountId,
          }),
        );
      }
    } catch (error) {
      for (const t of created) await this.transactions.delete(t.id);
      throw error;
    }
    return created;
  }
}
