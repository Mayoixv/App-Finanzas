import { NotFoundError } from '../errors';
import { IRecurringExpenseRepository, ITransactionRepository } from '../ports/repositories';

export class DeleteTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly recurring: IRecurringExpenseRepository,
  ) {}

  /** Borra el movimiento. Si era el pago de un gasto fijo, ese gasto vuelve a quedar pendiente. */
  async execute(id: string): Promise<void> {
    if (!(await this.transactions.get(id))) throw new NotFoundError('Movimiento');
    // Se busca antes de borrar: al borrar, la base deja transaction_id en NULL y ya no se podría encontrar.
    const instance = await this.recurring.findInstanceByTransaction(id);

    await this.transactions.delete(id);
    if (instance) {
      const { transactionId: _, ...rest } = instance;
      await this.recurring.saveInstance({ ...rest, status: 'pendiente' });
    }
  }
}
