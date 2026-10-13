import { locale } from '../i18n';

/** Tope "redondo" del eje para que las marcas caigan en números limpios (0, 25k, 50k…). */
export function niceMax(max: number, ticks = 4): number {
  if (max <= 0) return ticks;
  const raw = max / ticks;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw)!;
  return step * ticks;
}

/** Centavos a texto corto para ejes: 4500000 → "45k", 120000000 → "1.2M". */
export function compactMoney(cents: number): string {
  const v = cents / 100;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}k`;
  return `${sign}${Math.round(abs)}`;
}

const trim = (n: number) => (n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));


/** "2026-10" → "oct". */
export function shortMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(), { month: 'short' }).format(new Date(y, m - 1, 1)).replace('.', '');
}
