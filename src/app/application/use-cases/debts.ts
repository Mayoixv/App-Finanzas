import { Debt, DebtDirection, DebtPayment, installment, outstanding, splitPayment } from '../../domain/debts';
import { isValidCents } from '../../domain/money';
import { isValidIsoDate } from '../../domain/month';
import { NotFoundError, ValidationError } from '../errors';
import { ICategoryRepository, IDebtRepository, IdGenerator, ITransactionRepository } from '../ports/repositories';

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
  if (!name) throw new ValidationError('Escribe un nombre para la deuda');
  if (input.direction !== 'debo' && input.direction !== 'me_deben') throw new ValidationError('Tipo de deuda inválido');
  if (!isValidCents(input.principal)) throw new ValidationError('El monto debe ser mayor que cero');
  if (!(input.annualRate >= 0 && input.annualRate <= 200)) throw new ValidationError('La tasa debe estar entre 0% y 200%');
  if (input.termMonths !== null && !(Number.isInteger(input.termMonths) && input.termMonths >= 1 && input.termMonths <= 600)) {
    throw new ValidationError('El plazo debe ser de 1 a 600 meses');
  }
  if (!isValidIsoDate(input.startDate)) throw new ValidationError('Fecha inválida');
  return name;
}

export class SaveDebt {
  constructor(
    private readonly debts: IDebtRepository,
    private readonly ids: IdGenerator,
  ) {}

  /** Crea una deuda, o la edita si llega `id`. */
  async execute(input: DebtFields, id?: string): Promise<Debt> {
    if (id && !(await this.debts.get(id))) throw new NotFoundError('Deuda');
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
}

export class GetDebtsOverview {
  constructor(private readonly debts: IDebtRepository) {}

  async execute(): Promise<DebtView[]> {
    const [debts, payments] = await Promise.all([this.debts.list(), this.debts.listPayments()]);
    return debts.map((debt) => {
      const mine = payments.filter((p) => p.debtId === debt.id);
      return {
        debt,
        payments: mine,
        balance: outstanding(debt, mine),
        paidPrincipal: mine.reduce((s, p) => s + p.principal, 0),
        paidInterest: mine.reduce((s, p) => s + p.interest, 0),
        installment: installment(debt.principal, debt.annualRate, debt.termMonths),
      };
    });
  }
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
   * Con `asMovement`, crea además el gasto (o ingreso, si me deben) en Movimientos y lo enlaza.
   */
  async execute(debtId: string, date: string, amount: number, asMovement: boolean): Promise<DebtPayment> {
    const debt = await this.debts.get(debtId);
    if (!debt) throw new NotFoundError('Deuda');
    if (!isValidCents(amount)) throw new ValidationError('El monto debe ser mayor que cero');
    if (!isValidIsoDate(date)) throw new ValidationError('Fecha inválida');
    const balance = outstanding(debt, await this.debts.listPayments(debtId));
    if (balance <= 0) throw new ValidationError('Esta deuda ya está saldada');
    const split = splitPayment(balance, debt.annualRate, amount);
    if (split.interest + split.principal < amount) {
      throw new ValidationError('El pago es mayor que lo que queda por pagar');
    }

    let transactionId: string | undefined;
    if (asMovement) {
      if (!(await this.categories.get(PAYMENT_CATEGORY[debt.direction]))) {
        throw new ValidationError(
          debt.direction === 'debo'
            ? 'Falta la categoría "Pago de deudas"; créala en Ajustes o registra el pago sin movimiento'
            : 'Falta la categoría "Otros ingresos"; créala en Ajustes o registra el cobro sin movimiento',
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
  ) {}

  /** Borra el pago y, si había creado un movimiento, también ese movimiento. */
  async execute(payment: DebtPayment): Promise<void> {
    await this.debts.deletePayment(payment.id);
    if (payment.transactionId) await this.transactions.delete(payment.transactionId);
  }
}
