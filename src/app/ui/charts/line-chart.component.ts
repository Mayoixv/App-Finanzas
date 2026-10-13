import { Component, computed, input, model } from '@angular/core';
import { formatMoney } from '../format';
import { compactMoney, niceMax } from './scale';
import { t } from '../i18n';

const W = 340;
const H = 170;
const LEFT = 40;
const RIGHT = 12;
const BOTTOM = 22;
const TOP = 12;

/** Una sola serie en el tiempo: línea de 2px, área tenue, punto al final y lectura del punto tocado. */
@Component({
  selector: 'app-line-chart',
  templateUrl: 'line-chart.component.html',
  styleUrls: ['charts.scss'],
})
export class LineChartComponent {
  protected readonly t = t;
  readonly labels = input.required<string[]>();
  readonly fullLabels = input.required<string[]>();
  readonly values = input.required<number[]>();
  /** Qué es la serie, para la lectura ("Saldo en cuentas"). */
  readonly name = input.required<string>();
  readonly color = input('var(--series-1)');
  readonly selected = model(-1);

  protected readonly W = W;
  protected readonly H = H;
  protected readonly money = formatMoney;

  /** Admite negativos (cuentas en rojo): el eje baja hasta el mínimo redondeado. */
  private readonly range = computed(() => {
    const v = this.values();
    const max = niceMax(Math.max(0, ...v));
    const min = Math.min(0, ...v) < 0 ? -niceMax(-Math.min(...v)) : 0;
    return { min, max };
  });
  private readonly plotH = H - TOP - BOTTOM;
  private readonly step = computed(() => (W - LEFT - RIGHT) / Math.max(1, this.values().length - 1));

  protected readonly active = computed(() => {
    const i = this.selected();
    return i >= 0 && i < this.values().length ? i : this.values().length - 1;
  });

  protected readonly points = computed(() =>
    this.values().map((v, i) => ({ i, x: this.x(i), y: this.y(v), label: this.labels()[i] })),
  );

  protected readonly line = computed(() => this.points().map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '));

  protected readonly area = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const base = this.y(Math.max(0, this.range().min));
    return `${this.line()} L${pts.at(-1)!.x},${base} L${pts[0].x},${base} Z`;
  });

  protected readonly ticks = computed(() => {
    const { min, max } = this.range();
    return [0, 1, 2, 3, 4].map((k) => {
      const value = min + ((max - min) / 4) * k;
      return { y: this.y(value), label: compactMoney(value) };
    });
  });

  protected select(i: number) {
    this.selected.set(i);
  }

  protected hitX(i: number): number {
    return this.x(i) - this.step() / 2;
  }

  protected get hitW(): number {
    return this.step();
  }

  private x(i: number): number {
    return this.values().length === 1 ? LEFT + (W - LEFT - RIGHT) / 2 : LEFT + i * this.step();
  }

  private y(value: number): number {
    const { min, max } = this.range();
    return TOP + this.plotH - ((value - min) / (max - min)) * this.plotH;
  }
}
