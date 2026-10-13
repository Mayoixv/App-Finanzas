import { Component, computed, input, model } from '@angular/core';
import { formatMoney } from '../format';
import { compactMoney, niceMax } from './scale';
import { t } from '../i18n';

export interface ColumnSeries {
  name: string;
  /** Variable CSS del color de la serie (por ejemplo, 'var(--series-gastos)'). */
  color: string;
  values: number[];
}

const W = 340;
const H = 190;
const LEFT = 40;
const BOTTOM = 22;
const TOP = 8;
const BAR_MAX = 24;
const GAP = 2;
const RADIUS = 4;

/**
 * Columnas agrupadas por mes, un solo eje. Tocar (o enfocar) un mes lo selecciona y su lectura sale arriba;
 * los meses no seleccionados se atenúan.
 */
@Component({
  selector: 'app-column-chart',
  templateUrl: 'column-chart.component.html',
  styleUrls: ['charts.scss'],
})
export class ColumnChartComponent {
  protected readonly t = t;
  readonly labels = input.required<string[]>();
  /** Nombre completo de cada mes para la lectura y los lectores de pantalla. */
  readonly fullLabels = input.required<string[]>();
  readonly series = input.required<ColumnSeries[]>();
  readonly selected = model(-1);

  protected readonly W = W;
  protected readonly H = H;
  protected readonly money = formatMoney;

  private readonly max = computed(() => niceMax(Math.max(0, ...this.series().flatMap((s) => s.values))));
  private readonly plotW = W - LEFT;
  private readonly plotH = H - TOP - BOTTOM;
  private readonly band = computed(() => this.plotW / Math.max(1, this.labels().length));

  protected readonly active = computed(() => {
    const i = this.selected();
    return i >= 0 && i < this.labels().length ? i : this.labels().length - 1;
  });

  protected readonly ticks = computed(() =>
    [0, 1, 2, 3, 4].map((k) => {
      const value = (this.max() / 4) * k;
      return { y: this.y(value), label: compactMoney(value) };
    }),
  );

  protected readonly groups = computed(() => {
    const band = this.band();
    const n = this.series().length;
    const barW = Math.min(BAR_MAX, (band * 0.7 - GAP * (n - 1)) / n);
    const groupW = barW * n + GAP * (n - 1);
    return this.labels().map((label, i) => {
      const x0 = LEFT + band * i + (band - groupW) / 2;
      return {
        i,
        label,
        cx: LEFT + band * i + band / 2,
        hitX: LEFT + band * i,
        bars: this.series().map((s, k) => ({
          color: s.color,
          path: this.bar(x0 + k * (barW + GAP), barW, s.values[i] ?? 0),
        })),
      };
    });
  });

  protected select(i: number) {
    this.selected.set(i);
  }

  protected ariaFor(i: number): string {
    return `${this.fullLabels()[i]}: ${this.series()
      .map((s) => `${s.name} ${formatMoney(s.values[i] ?? 0)}`)
      .join(', ')}`;
  }

  protected get band$() {
    return this.band();
  }

  private y(value: number): number {
    return TOP + this.plotH - (value / this.max()) * this.plotH;
  }

  /** Columna con la punta redondeada y la base recta, apoyada en el eje. */
  private bar(x: number, w: number, value: number): string {
    if (value <= 0) return '';
    const top = this.y(value);
    const base = TOP + this.plotH;
    const r = Math.min(RADIUS, w / 2, base - top);
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
  }
}
