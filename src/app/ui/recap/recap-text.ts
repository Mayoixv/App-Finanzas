import { addMonths, MonthKey } from '../../domain/month';
import { RecapFact } from '../../domain/month-recap';
import { monthLabel } from '../format';
import { locale, t, tn } from '../i18n';

export interface RecapText {
  title: string;
  sub: string;
}

const pct = (n: number) => `${Math.round(Math.abs(n))}%`;

/** Nombre del día: 0 = domingo (el 4 de octubre de 2026 cae domingo). */
function weekdayName(day: number): string {
  return new Intl.DateTimeFormat(locale(), { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 4 + day)));
}

export function recapText(fact: RecapFact, month: MonthKey): RecapText {
  switch (fact.kind) {
    case 'count':
      return { title: tn('recap.count', fact.count), sub: t('recap.countSub') };
    case 'top':
      return { title: t('recap.top', { name: fact.name }), sub: t('recap.topSub', { percent: pct(fact.percent) }) };
    case 'change': {
      const key = fact.percent > 0 ? 'recap.up' : 'recap.down';
      return { title: t(key, { name: fact.name, percent: pct(fact.percent) }), sub: t('recap.changeSub', { month: monthLabel(addMonths(month, -1), false) }) };
    }
    case 'weekday':
      return { title: t('recap.weekday', { day: weekdayName(fact.weekday) }), sub: t('recap.weekdaySub', { percent: pct(fact.percent) }) };
    case 'noSpend':
      return { title: tn('recap.noSpend', fact.days), sub: t('recap.noSpendSub') };
    case 'saved':
      return fact.percent > 0
        ? { title: t('recap.saved', { percent: pct(fact.percent) }), sub: t('recap.savedSub') }
        : { title: t('recap.savedNone'), sub: t('recap.savedNoneSub') };
    case 'streak':
      return { title: tn('recap.streak', fact.months), sub: t('recap.streakSub') };
  }
}

/**
 * Dibuja el resumen en una imagen de 1080×1350 (la de una publicación) y la devuelve en base64, sin montos.
 * ponytail: las líneas largas se cortan por palabras; un idioma sin espacios (japonés) se corta por letras.
 */
export async function recapImage(month: MonthKey, facts: RecapFact[]): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d')!;
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const display = v('--font-display', 'sans-serif');
  const body = v('--font-body', 'sans-serif');
  await document.fonts.ready;

  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, v('--violet-400', '#8f6bff'));
  bg.addColorStop(0.45, v('--violet-600', '#6639ec'));
  bg.addColorStop(1, v('--violet-900', '#2a1478'));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Se mide todo primero para centrar el bloque en la imagen.
  const pad = 88;
  const width = W - pad * 2;
  ctx.font = `400 120px ${display}`;
  const head = wrap(ctx, monthLabel(month).toUpperCase(), width);
  ctx.font = `600 54px ${body}`;
  const items = facts.map((f) => wrap(ctx, recapText(f, month).title, width - 56));
  const height = 52 + head.length * 124 + 56 + items.reduce((s, l) => s + l.length * 66 + 36, 0);
  let y = Math.max(pad, (H - height) / 2);

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  ctx.font = `600 40px ${body}`;
  ctx.fillText(t('recap.title'), pad, y);
  y += 52;
  ctx.font = `400 120px ${display}`;
  for (const line of head) {
    ctx.fillText(line, pad, y);
    y += 124;
  }
  y += 56;

  ctx.font = `600 54px ${body}`;
  for (const lines of items) {
    if (y > H - 200) break;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(pad + 12, y + 28, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const line of lines) {
      ctx.fillText(line, pad + 56, y);
      y += 66;
    }
    y += 36;
  }

  ctx.font = `600 34px ${body}`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(t('recap.madeWith'), pad, H - pad - 34);
  return canvas.toDataURL('image/png').split(',')[1];
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.includes(' ') ? text.split(' ') : [...text];
  const glue = text.includes(' ') ? ' ' : '';
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + glue + word : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  return line ? [...lines, line] : lines;
}
