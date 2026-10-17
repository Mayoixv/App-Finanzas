import { Category, isExpenseType } from './category';
import { expenseBreakdown } from './expense-breakdown';
import { addMonths, daysInMonth, IsoDate, MonthKey, monthOf } from './month';
import { MonthlySummary } from './monthly-summary';
import { expandSplits, Transaction } from './transaction';

/** Cada tarjeta del resumen. Solo nombres, días y porcentajes: nada de montos, para poder compartirlo. */
export type RecapFact =
  | { kind: 'top'; name: string; percent: number }
  | { kind: 'change'; name: string; percent: number }
  | { kind: 'weekday'; weekday: number; percent: number }
  | { kind: 'noSpend'; days: number }
  | { kind: 'saved'; percent: number }
  | { kind: 'streak'; months: number }
  | { kind: 'count'; count: number };

/** Desde este cambio (en %) una categoría que subió o bajó merece su tarjeta. */
const MIN_CHANGE = 15;

/**
 * Datos curiosos del mes para "Tu mes en 30 segundos".
 * `history` son los resúmenes del mes y los anteriores, del más reciente al más antiguo (para la racha de ahorro).
 */
export function monthRecap(
  month: MonthKey,
  transactions: Transaction[],
  previous: Transaction[],
  categories: Category[],
  history: MonthlySummary[],
  today: IsoDate,
): RecapFact[] {
  const facts: RecapFact[] = [];
  const slices = expenseBreakdown(month, transactions, categories);
  const count = transactions.filter((t) => monthOf(t.date) === month).length;
  if (count > 0) facts.push({ kind: 'count', count });
  if (slices.length > 0) facts.push({ kind: 'top', name: slices[0].name, percent: slices[0].percent });

  const before = new Map(expenseBreakdown(addMonths(month, -1), previous, categories).map((s) => [s.categoryId, s.amount]));
  const changes = slices
    .filter((s) => (before.get(s.categoryId) ?? 0) > 0)
    .map((s) => ({ name: s.name, percent: (s.amount / before.get(s.categoryId)! - 1) * 100 }))
    .filter((c) => Math.abs(c.percent) >= MIN_CHANGE)
    .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));
  if (changes.length > 0) facts.push({ kind: 'change', ...changes[0] });

  const expenseIds = new Set(categories.filter((c) => isExpenseType(c.type)).map((c) => c.id));
  const spent = expandSplits(transactions).filter((t) => monthOf(t.date) === month && expenseIds.has(t.categoryId));
  const total = spent.reduce((s, t) => s + t.amount, 0);
  if (total > 0) {
    const byDay = Array<number>(7).fill(0);
    for (const t of spent) byDay[weekday(t.date)] += t.amount;
    const top = byDay.indexOf(Math.max(...byDay));
    facts.push({ kind: 'weekday', weekday: top, percent: (byDay[top] / total) * 100 });

    // Solo cuenta días ya vividos: en el mes en curso, hasta hoy.
    const lastDay = monthOf(today) === month ? Number(today.slice(8, 10)) : daysInMonth(month);
    const days = lastDay - new Set(spent.map((t) => t.date).filter((d) => Number(d.slice(8, 10)) <= lastDay)).size;
    if (days > 0) facts.push({ kind: 'noSpend', days });
  }

  const current = history[0];
  if (current && current.income > 0) facts.push({ kind: 'saved', percent: current.savingsPercent });
  const streak = history.findIndex((s) => s.saved <= 0);
  const months = streak === -1 ? history.length : streak;
  if (months >= 2) facts.push({ kind: 'streak', months });
  return facts;
}

/** 0 = domingo, como Date.getDay. */
export function weekday(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
