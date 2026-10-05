/** Mes en formato 'YYYY-MM'. Las fechas son 'YYYY-MM-DD'. */
export type MonthKey = string;
export type IsoDate = string;

export function monthOf(date: IsoDate): MonthKey {
  return date.slice(0, 7);
}

export function daysInMonth(month: MonthKey): number {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

/** Días de calendario entre dos fechas ISO (b - a); negativo si b es anterior. */
/** Fecha 'YYYY-MM-DD' que existe en el calendario (rechaza 2026-02-30 o 2026-13-01). */
export function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(`${y}-${String(m).padStart(2, '0')}`);
}

export function daysBetween(a: IsoDate, b: IsoDate): number {
  const toUtc = (d: IsoDate) => {
    const [y, m, day] = d.split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function dateInMonth(month: MonthKey, day: number): IsoDate {
  const clamped = Math.min(Math.max(day, 1), daysInMonth(month));
  return `${month}-${String(clamped).padStart(2, '0')}`;
}
