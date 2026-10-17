import { Cents } from './money';
import { daysBetween, daysInMonth, IsoDate, monthOf } from './month';

export type AffordVerdict = 'si' | 'justo' | 'espera' | 'no';

export interface Affordability {
  verdict: AffordVerdict;
  /** Lo que quedaría a fin de mes: disponible − fijos por pagar − la compra. */
  left: Cents;
  /** `left` repartido entre los días que faltan del mes, hoy incluido. */
  perDay: Cents;
  days: number;
  /** Fijos de gasto aún sin pagar este mes. */
  pending: Cents;
  /** Solo en 'espera': el cobro fijo a partir del cual alcanza. */
  waitUntil?: IsoDate;
}

export interface Income {
  date: IsoDate;
  amount: Cents;
}

/**
 * "¿Me alcanza?": compara la compra con el dinero disponible hoy menos los fijos que faltan por pagar este mes.
 * Si no alcanza pero sí con los ingresos fijos que faltan por cobrar, dice desde qué día.
 * ponytail: no mira presupuestos ni pagos de tarjeta; sumarlos si los usuarios lo piden.
 */
export function canAfford(amount: Cents, available: Cents, pending: Cents, incomes: Income[], today: IsoDate): Affordability {
  const days = daysInMonth(monthOf(today)) - Number(today.slice(8, 10)) + 1;
  const before = available - pending;
  const left = before - amount;
  const result = { left, perDay: Math.trunc(left / days), days, pending };
  if (left >= 0) return { ...result, verdict: left * 2 < before ? 'justo' : 'si' };

  let sum = left;
  for (const income of [...incomes].filter((i) => daysBetween(today, i.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))) {
    sum += income.amount;
    if (sum >= 0) return { ...result, verdict: 'espera', waitUntil: income.date };
  }
  return { ...result, verdict: 'no' };
}
