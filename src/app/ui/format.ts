import { Currency } from '../domain/currency';
import { Cents } from '../domain/money';
import { daysBetween, IsoDate, MonthKey } from '../domain/month';

const formatters: Record<Currency, Intl.NumberFormat> = {
  DOP: new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }),
  USD: new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'USD' }),
};
let currency: Currency = 'DOP';

/** Se llama al arrancar y al cambiar la moneda en Ajustes. */
export function setDisplayCurrency(value: Currency): void {
  currency = value;
}

export function displayCurrency(): Currency {
  return currency;
}

/** Recibe centavos: formatMoney(1250) muestra RD$12.50. */
export function formatMoney(cents: Cents): string {
  return formatters[currency].format(cents / 100);
}

/** Convierte lo escrito en un campo de monto a centavos; null si no es un monto válido mayor que cero. */
export function parseAmount(text: string): Cents | null {
  const value = Number(text.trim());
  if (!text.trim() || !Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  return cents > 0 ? cents : null;
}

/** Centavos al texto que se precarga en un campo al editar: 125050 pasa a "1250.5". */
export function amountToInput(cents: Cents): string {
  return String(cents / 100);
}

export function formatPercent(percent: number): string {
  return `${Math.round(percent * 10) / 10}%`;
}

export function currentMonth(now = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function todayIso(now = new Date()): string {
  return `${currentMonth(now)}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentMonth(d);
}

export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  const name = new Intl.DateTimeFormat('es-DO', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short' }).format(
    new Date(y, m - 1, d),
  );
}

export interface DueLabel {
  text: string;
  /** Vencido o a 3 días o menos: se resalta en ámbar. */
  urgent: boolean;
}

/** Texto de vencimiento de un gasto fijo pendiente, relativo a hoy. */
export function dueLabel(dueDate: IsoDate, today: IsoDate): DueLabel {
  const diff = daysBetween(today, dueDate);
  if (diff < 0) {
    const n = -diff;
    return { text: n === 1 ? 'Venció ayer' : `Venció hace ${n} días`, urgent: true };
  }
  if (diff === 0) return { text: 'Vence hoy', urgent: true };
  if (diff === 1) return { text: 'Vence mañana', urgent: true };
  if (diff <= 3) return { text: `Vence en ${diff} días`, urgent: true };
  if (diff <= 7) return { text: `Vence en ${diff} días`, urgent: false };
  return { text: `Vence el ${formatDay(dueDate)}`, urgent: false };
}
