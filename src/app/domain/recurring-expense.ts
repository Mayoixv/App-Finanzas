import { dateInMonth, IsoDate, MonthKey, monthsBetween } from './month';

/** Cada cuántos meses se repite: mensual, trimestral, semestral o anual. */
export type Frequency = 1 | 3 | 6 | 12;
export const FREQUENCIES: readonly Frequency[] = [1, 3, 6, 12];

/** Plantilla de pago (o cobro) que se repite: gasto fijo o ingreso fijo según su categoría. */
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
  frequency?: Frequency;
  /** Cuenta con que se paga o se cobra; sin valor, la última usada. */
  accountId?: string | null;
  /** Último mes en pausa ('YYYY-MM'); hasta ese mes inclusive no genera instancias. */
  pausedUntil?: MonthKey | null;
}

/** 'omitido': el usuario quitó el fijo solo ese mes; la fila evita que se vuelva a crear. */
export type PaymentStatus = 'pagado' | 'pendiente' | 'omitido';

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

/** Si el fijo ya empezó y no está en pausa ese mes (sin mirar la frecuencia). */
export function isRunningIn(expense: RecurringExpense, month: MonthKey): boolean {
  return month >= expense.startMonth && !(expense.pausedUntil && month <= expense.pausedUntil);
}

export function isPausedIn(expense: RecurringExpense, month: MonthKey): boolean {
  return month >= expense.startMonth && !!expense.pausedUntil && month <= expense.pausedUntil;
}

/** Si la plantilla genera instancia en ese mes: desde su inicio, cada `frequency` meses y fuera de una pausa. */
export function isDueIn(expense: RecurringExpense, month: MonthKey): boolean {
  return isRunningIn(expense, month) && monthsBetween(expense.startMonth, month) % (expense.frequency ?? 1) === 0;
}
