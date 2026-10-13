import { Component, computed, input } from '@angular/core';
import { ExpenseSlice } from '../../domain/expense-breakdown';
import { Category } from '../../domain/category';
import { lookOf } from '../category-look';
import { formatMoney, formatPercent } from '../format';
import { t } from '../i18n';

/** Color de "Otras" y de las categorías que ya no existen. */
const OTHER_COLOR = '#7d7898';
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

type Slice = Pick<ExpenseSlice, 'name' | 'amount' | 'percent'> & { categoryId?: string };

/** Agrupa lo que pasa del quinto lugar en "Otras" para que la leyenda siga legible. */
export function groupSlices(slices: Slice[]): Slice[] {
  if (slices.length <= MAX_SLICES) return slices;
  const head = slices.slice(0, MAX_SLICES - 1);
  const rest = slices.slice(MAX_SLICES - 1);
  return [
    ...head,
    {
      categoryId: undefined,
      name: t('donut.others'),
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
  protected readonly t = t;
  readonly slices = input.required<ExpenseSlice[]>();
  /** Para pintar cada arco con el color que el usuario eligió para su categoría. */
  readonly categories = input<Category[]>([]);

  protected readonly money = formatMoney;
  protected readonly percent = formatPercent;

  protected readonly total = computed(() => this.slices().reduce((s, x) => s + x.amount, 0));

  protected readonly arcs = computed<DonutArc[]>(() => {
    const grouped = groupSlices(this.slices());
    const byId = new Map(this.categories().map((c) => [c.id, c]));
    let consumed = 0;
    return grouped.map((slice) => {
      const category = slice.categoryId ? byId.get(slice.categoryId) : undefined;
      const length = (slice.percent / 100) * CIRCUMFERENCE;
      const dash = grouped.length > 1 ? Math.max(length - GAP, 0.5) : length;
      const arc: DonutArc = {
        name: slice.name,
        amount: slice.amount,
        percent: slice.percent,
        color: category ? lookOf(category).color : OTHER_COLOR,
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
