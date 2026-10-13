import { CASH_ACCOUNT_ID } from '../../domain/account';
import { MonthKey } from '../../domain/month';
import { markPaid, RecurringExpenseInstance } from '../../domain/recurring-expense';
import { NotFoundError, ValidationError } from '../errors';
import {
  IdGenerator,
  IDebtRepository,
  IRecurringExpenseRepository,
  ITransactionRepository,
} from '../ports/repositories';
import { recordDebtPayment } from './debts';

export interface PayRecurringExpenseInput {
  recurringExpenseId: string;
  month: MonthKey;
  paidDate: string;
}

/** Registra la transacción del gasto fijo y marca su instancia del mes como pagada. */
export class PayRecurringExpense {
  constructor(
    private readonly recurring: IRecurringExpenseRepository,
    private readonly transactions: ITransactionRepository,
    private readonly ids: IdGenerator,
    private readonly debts?: IDebtRepository,
  ) {}

  async execute(input: PayRecurringExpenseInput): Promise<RecurringExpenseInstance> {
    const expense = await this.recurring.get(input.recurringExpenseId);
    if (!expense) throw new NotFoundError('Gasto fijo');

    const instances = await this.recurring.listInstances(input.month);
    const instance = instances.find((i) => i.recurringExpenseId === expense.id);
    if (!instance) throw new NotFoundError('Gasto fijo del mes');
    if (instance.status === 'pagado') throw new ValidationError('Este gasto ya está pagado');

    const transactionId = this.ids.next();
    await this.transactions.save({
      id: transactionId,
      date: input.paidDate,
      amount: instance.amount,
      categoryId: expense.categoryId,
      note: expense.name,
      accountId: expense.accountId ?? CASH_ACCOUNT_ID,
    });

    const paid = markPaid(instance, transactionId);
    try {
      await this.recurring.saveInstance(paid);
      // La cuota de una deuda: el mismo movimiento cuenta como pago y baja su saldo.
      if (expense.debtId && this.debts) {
        await recordDebtPayment(this.debts, this.ids, expense.debtId, input.paidDate, instance.amount, transactionId);
      }
    } catch (error) {
      // Sin esto quedaría un gasto registrado con la instancia aún pendiente, y se podría pagar dos veces.
      await this.transactions.delete(transactionId);
      throw error;
    }
    return paid;
  }
}
