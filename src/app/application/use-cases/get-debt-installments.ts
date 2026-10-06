import { splitPayment } from '../../domain/debts';
import { dateInMonth, IsoDate, MonthKey, monthOf, monthsBetween } from '../../domain/month';
import { DebtView, GetDebtsOverview } from './debts';

export interface DebtInstallment {
  view: DebtView;
  /** Número de cuota (1 = el mes siguiente al préstamo) y total del plazo. */
  number: number;
  of: number;
  dueDate: IsoDate;
  amount: number;
  /** Pagada si hay al menos un pago a esa deuda dentro del mes. */
  paid: boolean;
}

/** Cuotas que tocan en `month` de las deudas propias con plazo y saldo. */
export class GetDebtInstallments {
  constructor(private readonly debts: GetDebtsOverview) {}

  async execute(month: MonthKey): Promise<DebtInstallment[]> {
    const out: DebtInstallment[] = [];
    for (const view of await this.debts.execute()) {
      const { debt } = view;
      if (debt.direction !== 'debo' || !debt.termMonths || view.installment <= 0) continue;
      const number = monthsBetween(monthOf(debt.startDate), month);
      if (number < 1 || number > debt.termMonths) continue;
      const paid = view.payments.some((p) => monthOf(p.date) === month);
      // Saldada antes de tiempo: ya no hay cuota que mostrar.
      if (view.balance <= 0 && !paid) continue;
      out.push({
        view,
        number,
        of: debt.termMonths,
        dueDate: dateInMonth(month, Number(debt.startDate.slice(8))),
        // La última cuota puede ser menor: lo que queda más el interés de ese mes (el pago cubre primero el interés).
        amount: paid
          ? view.installment
          : Math.min(view.installment, view.balance + splitPayment(view.balance, debt.annualRate, Number.MAX_SAFE_INTEGER).interest),
        paid,
      });
    }
    return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
}
