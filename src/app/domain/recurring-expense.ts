import { dateInMonth, IsoDate, MonthKey } from './month';

/** Plantilla de gasto fijo. */
export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  /** Día del mes (1-31); en meses cortos se ajusta al último día. */
  dueDay: number;
  active: boolean;
  /** Primer mes en que corre; antes de él no genera instancias. */
  startMonth: MonthKey;
}

export type PaymentStatus = 'pagado' | 'pendiente';

/** Instancia mensual de una plantilla. */
export interface RecurringExpenseInstance {
  recurringExpenseId: string;
  month: MonthKey;
  dueDate: IsoDate;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
}

export function createInstance(
  template: RecurringExpense,
  month: MonthKey,
): RecurringExpenseInstance {
  return {
    recurringExpenseId: template.id,
    month,
    dueDate: dateInMonth(month, template.dueDay),
    amount: template.amount,
    status: 'pendiente',
  };
}

export function markPaid(
  instance: RecurringExpenseInstance,
  transactionId: string,
): RecurringExpenseInstance {
  return { ...instance, status: 'pagado', transactionId };
}
