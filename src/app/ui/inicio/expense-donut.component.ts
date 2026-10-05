import { Component, computed, input } from '@angular/core';
import { ExpenseSlice } from '../../domain/expense-breakdown';
import { formatMoney, formatPercent } from '../format';

/** Tonos de la familia violeta más dos acentos (design.md); sin verde ni rojo, que solo significan dinero. */
export const DONUT_COLORS = ['#8f6bff', '#c9b8ff', '#6a3df0', '#ffb84d', '#4dd6e0', '#7d7898'];
const MAX_SLICES = 6;

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3;

export interface DonutArc {
  name: string;
  amount: number;
  percent: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

type Slice = Pick<ExpenseSlice, 'name' | 'amount' | 'percent'>;

/** Agrupa lo que pasa del quinto lugar en "Otras" para que la leyenda siga legible. */
export function groupSlices(slices: Slice[]): Slice[] {
  if (slices.length <= MAX_SLICES) return slices;
  const head = slices.slice(0, MAX_SLICES - 1);
  const rest = slices.slice(MAX_SLICES - 1);
  return [
    ...head,
    {
      name: 'Otras',
      amount: rest.reduce((s, r) => s + r.amount, 0),
      percent: rest.reduce((s, r) => s + r.percent, 0),
    },
  ];
}

@Component({
  selector: 'app-expense-donut',
  templateUrl: 'expense-donut.component.html',
  styleUrls: ['expense-donut.component.scss'],
})
export class ExpenseDonutComponent {
  readonly slices = input.required<ExpenseSlice[]>();

  protected readonly money = formatMoney;
  protected readonly percent = formatPercent;

  protected readonly total = computed(() => this.slices().reduce((s, x) => s + x.amount, 0));

  protected readonly arcs = computed<DonutArc[]>(() => {
    const grouped = groupSlices(this.slices());
    let consumed = 0;
    return grouped.map((slice, i) => {
      const length = (slice.percent / 100) * CIRCUMFERENCE;
      const dash = grouped.length > 1 ? Math.max(length - GAP, 0.5) : length;
      const arc: DonutArc = {
        name: slice.name,
        amount: slice.amount,
        percent: slice.percent,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -consumed,
      };
      consumed += length;
      return arc;
    });
  });

  protected readonly summary = computed(() =>
    this.arcs()
      .map((a) => `${a.name} ${formatPercent(a.percent)}`)
      .join(', '),
  );
}
