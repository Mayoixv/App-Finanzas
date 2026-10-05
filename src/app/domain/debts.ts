import { Cents } from './money';
import { IsoDate } from './month';

export type DebtDirection = 'debo' | 'me_deben';

export interface Debt {
  id: string;
  name: string;
  /** 'debo': préstamo o financiamiento que pago yo. 'me_deben': dinero que presté. */
  direction: DebtDirection;
  principal: Cents;
  /** Tasa anual en porcentaje (18 = 18% anual). 0 si no cobra interés. */
  annualRate: number;
  /** Plazo en meses; sin plazo no hay cuota fija ni calendario. */
  termMonths: number | null;
  startDate: IsoDate;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  date: IsoDate;
  amount: Cents;
  /** Parte que baja el saldo. */
  principal: Cents;
  /** Parte que fue interés. */
  interest: Cents;
  /** Movimiento creado junto con el pago, si se pidió. */
  transactionId?: string;
}

export interface AmortizationRow {
  n: number;
  payment: Cents;
  interest: Cents;
  principal: Cents;
  balance: Cents;
}

const monthlyRate = (annualRate: number) => annualRate / 100 / 12;

/** Cuota fija mensual (sistema francés). Sin interés, el capital repartido en partes iguales. */
export function installment(principal: Cents, annualRate: number, termMonths: number | null): Cents {
  if (!termMonths) return 0;
  const r = monthlyRate(annualRate);
  if (r === 0) return Math.ceil(principal / termMonths);
  return Math.round((principal * r) / (1 - (1 + r) ** -termMonths));
}

/** Calendario completo de cuotas. La última absorbe la diferencia de redondeo y deja el saldo en 0. */
export function amortization(principal: Cents, annualRate: number, termMonths: number | null): AmortizationRow[] {
  if (!termMonths) return [];
  const r = monthlyRate(annualRate);
  const pay = installment(principal, annualRate, termMonths);
  const rows: AmortizationRow[] = [];
  let balance = principal;
  for (let n = 1; n <= termMonths && balance > 0; n++) {
    const interest = Math.round(balance * r);
    const principalPart = n === termMonths ? balance : Math.min(pay - interest, balance);
    balance -= principalPart;
    rows.push({ n, payment: interest + principalPart, interest, principal: principalPart, balance });
  }
  return rows;
}

export function outstanding(debt: Debt, payments: DebtPayment[]): Cents {
  return debt.principal - payments.filter((p) => p.debtId === debt.id).reduce((s, p) => s + p.principal, 0);
}

/** Cuánto de un pago es interés del mes (sobre el saldo actual) y cuánto baja el saldo. */
export function splitPayment(balance: Cents, annualRate: number, amount: Cents): { interest: Cents; principal: Cents } {
  const interest = Math.min(Math.round(balance * monthlyRate(annualRate)), amount);
  return { interest, principal: Math.min(amount - interest, balance) };
}

export type DebtStrategy = 'bola_de_nieve' | 'avalancha';

export interface StrategyDebt {
  id: string;
  balance: Cents;
  annualRate: number;
  minPayment: Cents;
}

export interface StrategyResult {
  /** null si con esos pagos la deuda no se termina nunca (los intereses le ganan a los pagos). */
  months: number | null;
  totalInterest: Cents;
  /** En qué orden se van saldando. */
  order: string[];
}

const MAX_MONTHS = 600;

/**
 * Simula mes a mes pagando el mínimo de cada deuda y todo el extra a una sola: la de menor saldo
 * (bola de nieve) o la de mayor tasa (avalancha). Al saldar una, su mínimo pasa a la siguiente.
 */
export function simulateStrategy(debts: StrategyDebt[], extra: Cents, strategy: DebtStrategy): StrategyResult {
  const state = debts.filter((d) => d.balance > 0).map((d) => ({ ...d }));
  const budget = state.reduce((s, d) => s + d.minPayment, 0) + extra;
  const order: string[] = [];
  let totalInterest = 0;
  for (let month = 1; month <= MAX_MONTHS; month++) {
    const open = state.filter((d) => d.balance > 0);
    if (open.length === 0) return { months: month - 1, totalInterest, order };
    for (const d of open) {
      const interest = Math.round(d.balance * monthlyRate(d.annualRate));
      d.balance += interest;
      totalInterest += interest;
    }
    let money = budget;
    for (const d of open) {
      const pay = Math.min(d.minPayment, d.balance, money);
      d.balance -= pay;
      money -= pay;
    }
    const targets = open
      .filter((d) => d.balance > 0)
      .sort((a, b) => (strategy === 'bola_de_nieve' ? a.balance - b.balance : b.annualRate - a.annualRate));
    for (const d of targets) {
      const pay = Math.min(d.balance, money);
      d.balance -= pay;
      money -= pay;
    }
    for (const d of open) if (d.balance === 0 && !order.includes(d.id)) order.push(d.id);
  }
  return { months: null, totalInterest, order };
}
