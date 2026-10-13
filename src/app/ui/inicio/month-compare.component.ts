import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowDown, arrowUp, remove } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { change, MonthlySummary } from '../../domain/monthly-summary';
import { formatMoney } from '../format';
import { MonthState } from '../month-state';
import { t, locale } from '../i18n';

const monthName = (d: Date) => new Intl.DateTimeFormat(locale(), { month: 'long' }).format(d);
const monthShort = (d: Date) => new Intl.DateTimeFormat(locale(), { month: 'short', year: 'numeric' }).format(d);

const dateOf = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
};

interface Line {
  label: string;
  icon: 'arrow-up' | 'arrow-down' | 'remove';
  /** Bueno o malo para el bolsillo: más gasto es malo, más ingreso es bueno. */
  tone: 'good' | 'bad' | 'same';
  text: string;
}

interface Row {
  month: string;
  label: string;
  current: boolean;
  empty: boolean;
  balance: string;
  negative: boolean;
  detail: string;
}

const isEmpty = (s: MonthlySummary) => s.income === 0 && s.expenses === 0 && s.saved === 0;

function line(label: string, current: number, previous: number, prevName: string, upIsGood: boolean): Line {
  const { diff, percent } = change(current, previous);
  if (diff === 0) return { label, icon: 'remove', tone: 'same', text: t('compare.same', { month: prevName }) };
  const up = diff > 0;
  const amount = `${up ? '+' : '−'}${formatMoney(Math.abs(diff))}`;
  const howMuch = percent === null ? '' : `${Math.round(Math.abs(percent))}% `;
  return {
    label,
    icon: up ? 'arrow-up' : 'arrow-down',
    tone: up === upIsGood ? 'good' : 'bad',
    text: t(up ? 'compare.more' : 'compare.less', { percent: howMuch, month: prevName, amount }),
  };
}

/** Tarjeta "Mes a mes" de Inicio: el mes visto contra el anterior y los últimos 6 meses. */
@Component({
  selector: 'app-month-compare',
  templateUrl: 'month-compare.component.html',
  styleUrls: ['month-compare.component.scss'],
  imports: [IonIcon, RouterLink],
})
export class MonthCompareComponent {
  protected readonly t = t;
  private readonly container = inject(APP_CONTAINER);
  private readonly monthState = inject(MonthState);

  protected readonly prevName = signal('');
  protected readonly lines = signal<Line[] | null>(null);
  protected readonly rows = signal<Row[]>([]);
  private loadSeq = 0;

  constructor() {
    addIcons({ arrowUp, arrowDown, remove });
    effect(() => {
      const month = this.monthState.month();
      this.monthState.version();
      this.load(month);
    });
  }

  private async load(month: string) {
    const seq = ++this.loadSeq;
    try {
      const history = await this.container.getMonthHistory.execute(month);
      if (seq !== this.loadSeq) return;
      const [current, previous] = history;
      const prevName = monthName(dateOf(previous.month));
      this.prevName.set(prevName);
      this.lines.set(
        isEmpty(previous)
          ? null
          : [
              line(t('inicio.expenses'), current.expenses, previous.expenses, prevName, false),
              line(t('inicio.income'), current.income, previous.income, prevName, true),
            ],
      );
      // Los meses anteriores al primer movimiento no dicen nada: se recortan.
      let last = history.length - 1;
      while (last > 0 && isEmpty(history[last])) last--;
      this.rows.set(
        history.slice(0, last + 1).map((s, i) => ({
          month: s.month,
          label: monthShort(dateOf(s.month)),
          current: i === 0,
          empty: isEmpty(s),
          balance: formatMoney(s.balance),
          negative: s.balance < 0,
          detail: t('compare.detail', { income: formatMoney(s.income), expenses: formatMoney(s.expenses), saved: formatMoney(s.saved) }),
        })),
      );
    } catch (error) {
      // Es una tarjeta de ayuda: si falla, no se muestra y el resto de Inicio sigue funcionando.
      console.error(error);
      this.rows.set([]);
    }
  }
}
