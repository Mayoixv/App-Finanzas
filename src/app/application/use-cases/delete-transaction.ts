import { RecurringExpenseInstance } from '../../domain/recurring-expense';
import { Attachment, Transaction } from '../../domain/transaction';
import { NotFoundError } from '../errors';
import { IDebtRepository, IRecurringExpenseRepository, ITransactionRepository } from '../ports/repositories';
import { DebtPayment } from '../../domain/debts';

/** Lo que se borró, para poder deshacerlo. */
export interface DeletedTransaction {
  transaction: Transaction;
  /** Instancia de gasto fijo que este movimiento pagaba, tal como estaba (pagada). */
  paidInstance?: RecurringExpenseInstance;
  /** Pago de deuda que hacía este movimiento (cuota de un fijo enlazado a una deuda). */
  debtPayments?: DebtPayment[];
  attachments: Attachment[];
}

export class DeleteTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly recurring: IRecurringExpenseRepository,
    private readonly debts?: IDebtRepository,
  ) {}

  /** Borra el movimiento. Si era el pago de un gasto fijo, ese gasto vuelve a quedar pendiente. */
  async execute(id: string): Promise<DeletedTransaction> {
    const transaction = await this.transactions.get(id);
    if (!transaction) throw new NotFoundError('Movimiento');
    // Se busca antes de borrar: al borrar, la base deja transaction_id en NULL y ya no se podría encontrar.
    const instance = await this.recurring.findInstanceByTransaction(id);
    // Las fotos se borran en cascada con el movimiento; se guardan aquí para poder deshacer.
    const attachments = await this.transactions.listAttachments(id);
    // El pago a la deuda se va con el movimiento: así el saldo de la deuda vuelve a como estaba.
    const debtPayments = ((await this.debts?.listPayments()) ?? []).filter((p) => p.transactionId === id);
    for (const p of debtPayments) await this.debts!.deletePayment(p.id);

    await this.transactions.delete(id);
    if (instance) {
      const { transactionId: _, ...rest } = instance;
      await this.recurring.saveInstance({ ...rest, status: 'pendiente' });
    }
    return { transaction, paidInstance: instance, debtPayments, attachments };
  }
}

/** Deshace DeleteTransaction: vuelve a guardar el movimiento y, si pagaba un gasto fijo, lo marca pagado otra vez. */
export class RestoreTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly recurring: IRecurringExpenseRepository,
    private readonly debts?: IDebtRepository,
  ) {}

  async execute(deleted: DeletedTransaction): Promise<void> {
    await this.transactions.save(deleted.transaction);
    for (const a of deleted.attachments) await this.transactions.saveAttachment(a);
    if (deleted.paidInstance) await this.recurring.saveInstance(deleted.paidInstance);
    for (const p of deleted.debtPayments ?? []) await this.debts?.savePayment(p);
  }
}
