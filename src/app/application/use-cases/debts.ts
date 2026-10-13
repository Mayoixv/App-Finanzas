import { Debt, DebtDirection, DebtPayment, installment, outstanding, splitPayment } from '../../domain/debts';
import { isValidCents } from '../../domain/money';
import { isValidIsoDate } from '../../domain/month';
import { NotFoundError, ValidationError } from '../errors';
import { RecurringExpense } from '../../domain/recurring-expense';
import { ICategoryRepository, IDebtRepository, IdGenerator, IRecurringExpenseRepository, ITransactionRepository } from '../ports/repositories';
import { monthOf } from '../../domain/month';

/** Categorías con que se registra un pago como movimiento del mes. */
const PAYMENT_CATEGORY: Record<DebtDirection, string> = {
  debo: 'cat-pago-deudas',
  me_deben: 'cat-otros-ingresos',
};

export interface DebtFields {
  name: string;
  direction: DebtDirection;
  principal: number;
  annualRate: number;
  termMonths: number | null;
  startDate: string;
}

function validateDebt(input: DebtFields): string {
  const name = input.name.trim();
  if (!name) throw new ValidationError('debtName');
  if (input.direction !== 'debo' && input.direction !== 'me_deben') throw new ValidationError('debtType');
  if (!isValidCents(input.principal)) throw new ValidationError('amountPositive');
  if (!(input.annualRate >= 0 && input.annualRate <= 200)) throw new ValidationError('rate');
  if (input.termMonths !== null && !(Number.isInteger(input.termMonths) && input.termMonths >= 1 && input.termMonths <= 600)) {
    throw new ValidationError('term');
  }
  if (!isValidIsoDate(input.startDate)) throw new ValidationError('date');
  return name;
}

export class SaveDebt {
  constructor(
    private readonly debts: IDebtRepository,
    private readonly ids: IdGenerator,
  ) {}

  /** Crea una deuda, o la edita si llega `id`. */
  async execute(input: DebtFields, id?: string): Promise<Debt> {
    if (id && !(await this.debts.get(id))) throw new NotFoundError('debt');
    const debt: Debt = { ...input, id: id ?? this.ids.next(), name: validateDebt(input) };
    await this.debts.save(debt);
    return debt;
  }
}

export class DeleteDebt {
  constructor(private readonly debts: IDebtRepository) {}

  /** Borra la deuda y su historial de pagos. Los movimientos creados con los pagos se quedan en Movimientos. */
  execute(id: string): Promise<void> {
    return this.debts.delete(id);
  }
}

export interface DebtView {
  debt: Debt;
  payments: DebtPayment[];
  balance: number;
  paidPrincipal: number;
  paidInterest: number;
  /** Cuota fija si tiene plazo; 0 si no. */
  installment: number;
  /** Fijo activo que paga la cuota, si la deuda se pasó a Fijos. */
  fixedId?: string;
}

export class GetDebtsOverview {
  constructor(
    private readonly debts: IDebtRepository,
    private readonly recurring?: IRecurringExpenseRepository,
  ) {}

  async execute(): Promise<DebtView[]> {
    const [debts, payments, fixed] = await Promise.all([
      this.debts.list(),
      this.debts.listPayments(),
      this.recurring?.list() ?? [],
    ]);
    return debts.map((debt) => {
      const mine = payments.filter((p) => p.debtId === debt.id);
      return {
        debt,
        payments: mine,
        balance: outstanding(debt, mine),
        paidPrincipal: mine.reduce((s, p) => s + p.principal, 0),
        paidInterest: mine.reduce((s, p) => s + p.interest, 0),
        installment: installment(debt.principal, debt.annualRate, debt.termMonths),
        fixedId: fixed.find((f) => f.debtId === debt.id && f.active)?.id,
      };
    });
  }
}

/**
 * Pasa la cuota de una deuda a Fijos: crea un gasto fijo mensual con la cuota, en "Pago de deudas", desde el mes
 * que viene en `fromMonth`. Desde ahí la cuota se paga en Fijos como cualquier gasto fijo y baja el saldo de la deuda.
 */
export class AddDebtAsFixed {
  constructor(
    private readonly debts: GetDebtsOverview,
    private readonly recurring: IRecurringExpenseRepository,
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(debtId: string, fromMonth: string): Promise<RecurringExpense> {
    const view = (await this.debts.execute()).find((d) => d.debt.id === debtId);
    if (!view) throw new NotFoundError('debt');
    if (view.debt.direction !== 'debo' || view.installment <= 0) {
      throw new ValidationError('debtNoInstallment');
    }
    if (view.fixedId) throw new ValidationError('debtAlreadyFixed');
    if (view.balance <= 0) throw new ValidationError('debtPaid');
    if (!(await this.categories.get(PAYMENT_CATEGORY.debo))) {
      throw new ValidationError('debtCategoryMissing');
    }
    const fixed: RecurringExpense = {
      id: this.ids.next(),
      name: view.debt.name,
      amount: view.installment,
      categoryId: PAYMENT_CATEGORY.debo,
      dueDay: Number(view.debt.startDate.slice(8)),
      active: true,
      startMonth: fromMonth > monthOf(view.debt.startDate) ? fromMonth : monthOf(view.debt.startDate),
      frequency: 1,
      accountId: null,
      pausedUntil: null,
      debtId,
    };
    await this.recurring.save(fixed);
    return fixed;
  }
}

/** Pago a la deuda por el monto `amount`, enlazado al movimiento `transactionId` (el del fijo pagado). */
export async function recordDebtPayment(
  debts: IDebtRepository,
  ids: IdGenerator,
  debtId: string,
  date: string,
  amount: number,
  transactionId: string,
): Promise<DebtPayment | null> {
  const debt = await debts.get(debtId);
  if (!debt) return null;
  const balance = outstanding(debt, await debts.listPayments(debtId));
  if (balance <= 0) return null;
  const split = splitPayment(balance, debt.annualRate, amount);
  const payment: DebtPayment = { id: ids.next(), debtId, date, amount, ...split, transactionId };
  await debts.savePayment(payment);
  return payment;
}

export class RegisterDebtPayment {
  constructor(
    private readonly debts: IDebtRepository,
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  /**
   * Registra un pago: primero cubre el interés del mes sobre el saldo y el resto baja el saldo.
   * Con `asMovement`, crea además el gasto (o ingreso, si me deben) en Movimientos, en la cuenta `accountId`, y lo enlaza.
   */
  async execute(debtId: string, date: string, amount: number, asMovement: boolean, accountId?: string): Promise<DebtPayment> {
    const debt = await this.debts.get(debtId);
    if (!debt) throw new NotFoundError('debt');
    if (!isValidCents(amount)) throw new ValidationError('amountPositive');
    if (!isValidIsoDate(date)) throw new ValidationError('date');
    const balance = outstanding(debt, await this.debts.listPayments(debtId));
    if (balance <= 0) throw new ValidationError('debtPaid');
    const split = splitPayment(balance, debt.annualRate, amount);
    if (split.interest + split.principal < amount) {
      throw new ValidationError('paymentTooBig');
    }

    let transactionId: string | undefined;
    if (asMovement) {
      if (!(await this.categories.get(PAYMENT_CATEGORY[debt.direction]))) {
        throw new ValidationError(
          debt.direction === 'debo'
            ? 'debtPaymentCategory'
            : 'debtIncomeCategory',
        );
      }
      transactionId = this.ids.next();
      await this.transactions.save({
        id: transactionId,
        date,
        amount,
        categoryId: PAYMENT_CATEGORY[debt.direction],
        note: debt.name,
        tags: [],
        splits: [],
        ...(accountId ? { accountId } : {}),
      });
    }
    const payment: DebtPayment = { id: this.ids.next(), debtId, date, amount, ...split, transactionId };
    await this.debts.savePayment(payment);
    return payment;
  }
}

export class DeleteDebtPayment {
  constructor(
    private readonly debts: IDebtRepository,
    private readonly transactions: ITransactionRepository,
    private readonly recurring?: IRecurringExpenseRepository,
  ) {}

  /** Borra el pago y, si había creado un movimiento, también ese movimiento (y el fijo que pagaba vuelve a pendiente). */
  async execute(payment: DebtPayment): Promise<void> {
    await this.debts.deletePayment(payment.id);
    if (!payment.transactionId) return;
    const instance = await this.recurring?.findInstanceByTransaction(payment.transactionId);
    await this.transactions.delete(payment.transactionId);
    if (instance) {
      const { transactionId: _, ...rest } = instance;
      await this.recurring!.saveInstance({ ...rest, status: 'pendiente' });
    }
  }
}
