import { RecurringExpenseInstance } from '../../domain/recurring-expense';
import { Attachment, Transaction } from '../../domain/transaction';
import { NotFoundError } from '../errors';
import { IRecurringExpenseRepository, ITransactionRepository } from '../ports/repositories';

/** Lo que se borró, para poder deshacerlo. */
export interface DeletedTransaction {
  transaction: Transaction;
  /** Instancia de gasto fijo que este movimiento pagaba, tal como estaba (pagada). */
  paidInstance?: RecurringExpenseInstance;
  attachments: Attachment[];
}

export class DeleteTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly recurring: IRecurringExpenseRepository,
  ) {}

  /** Borra el movimiento. Si era el pago de un gasto fijo, ese gasto vuelve a quedar pendiente. */
  async execute(id: string): Promise<DeletedTransaction> {
    const transaction = await this.transactions.get(id);
    if (!transaction) throw new NotFoundError('Movimiento');
    // Se busca antes de borrar: al borrar, la base deja transaction_id en NULL y ya no se podría encontrar.
    const instance = await this.recurring.findInstanceByTransaction(id);
    // Las fotos se borran en cascada con el movimiento; se guardan aquí para poder deshacer.
    const attachments = await this.transactions.listAttachments(id);

    await this.transactions.delete(id);
    if (instance) {
      const { transactionId: _, ...rest } = instance;
      await this.recurring.saveInstance({ ...rest, status: 'pendiente' });
    }
    return { transaction, paidInstance: instance, attachments };
  }
}

/** Deshace DeleteTransaction: vuelve a guardar el movimiento y, si pagaba un gasto fijo, lo marca pagado otra vez. */
export class RestoreTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly recurring: IRecurringExpenseRepository,
  ) {}

  async execute(deleted: DeletedTransaction): Promise<void> {
    await this.transactions.save(deleted.transaction);
    for (const a of deleted.attachments) await this.transactions.saveAttachment(a);
    if (deleted.paidInstance) await this.recurring.saveInstance(deleted.paidInstance);
  }
}
