import { Component, effect, inject, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { Budget, BudgetStatus } from '../../domain/budget';
import { formatMoney, monthLabel, shiftMonth } from '../format';
import { MonthState } from '../month-state';
import { BudgetFormService } from './budget-form.service';

/** Desde este porcentaje del límite la barra pasa a ámbar como aviso. */
const BUDGET_WARNING_PERCENT = 85;

interface BudgetRow {
  budget: Budget;
  name: string;
  spent: number;
  limit: number;
  /** Para el ancho de la barra: nunca más de 100. */
  bar: number;
  state: 'ok' | 'warning' | 'exceeded';
  text: string;
}

/** Tarjeta de presupuestos del mes en Inicio: cuánto queda por categoría, con alta, edición y copia del mes anterior. */
@Component({
  selector: 'app-budgets-card',
  templateUrl: 'budgets-card.component.html',
  styleUrls: ['budgets-card.component.scss'],
  imports: [IonIcon],
})
export class BudgetsCardComponent {
  private readonly container = inject(APP_CONTAINER);
  private readonly form = inject(BudgetFormService);
  protected readonly monthState = inject(MonthState);

  protected readonly rows = signal<BudgetRow[] | null>(null);
  protected readonly failed = signal(false);
  /** Cuántos presupuestos tuvo el mes anterior; si este mes no tiene, se ofrece copiarlos. */
  protected readonly previousCount = signal(0);
  protected readonly previousLabel = signal('');
  protected readonly liveMessage = signal('');
  protected readonly money = formatMoney;
  /** Cada carga lleva un número; si el usuario cambió de mes mientras tanto, la respuesta vieja se descarta. */
  private loadSeq = 0;

  constructor() {
    addIcons({ alertCircleOutline });
    effect(() => {
      const month = this.monthState.month();
      this.monthState.version();
      this.load(month);
    });
  }

  protected add() {
    this.form.open(undefined, (this.rows() ?? []).map((r) => r.budget.categoryId));
  }

  protected edit(row: BudgetRow) {
    this.form.open(row.budget, []);
  }

  protected async copyPrevious() {
    const month = this.monthState.month();
    try {
      const copied = await this.container.copyBudgets.execute(shiftMonth(month, -1), month);
      this.liveMessage.set(`${copied} presupuestos copiados de ${this.previousLabel()}`);
      this.monthState.notifyChange();
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudieron copiar los presupuestos. Inténtalo de nuevo.');
    }
  }

  private async load(month: string) {
    const seq = ++this.loadSeq;
    const previous = shiftMonth(month, -1);
    try {
      const [statuses, previousStatuses, categories] = await Promise.all([
        this.container.getBudgetStatuses.execute(month),
        this.container.getBudgetStatuses.execute(previous),
        this.container.categories.list(),
      ]);
      if (seq !== this.loadSeq) return;
      const names = new Map(categories.map((c) => [c.id, c.name]));
      this.rows.set(
        statuses
          .map(({ budget, status }) => toRow(budget, status, names.get(budget.categoryId)))
          .sort((a, b) => b.spent / Math.max(b.limit, 1) - a.spent / Math.max(a.limit, 1)),
      );
      this.previousCount.set(previousStatuses.length);
      this.previousLabel.set(monthLabel(previous));
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      if (seq === this.loadSeq) this.failed.set(true);
    }
  }
}

function toRow(budget: Budget, status: BudgetStatus, name = 'Categoría'): BudgetRow {
  const { spent, limit, remaining, carry } = status;
  const percent = limit > 0 ? (spent / limit) * 100 : spent > 0 ? 100 : 0;
  const state = status.exceeded ? 'exceeded' : percent >= BUDGET_WARNING_PERCENT ? 'warning' : 'ok';
  const left = state === 'exceeded' ? `Te pasaste por ${formatMoney(-remaining)}` : `Te quedan ${formatMoney(remaining)}`;
  const carried =
    carry > 0 ? ` · incluye ${formatMoney(carry)} del mes pasado` : carry < 0 ? ` · descuenta ${formatMoney(-carry)} del mes pasado` : '';
  return {
    budget,
    name,
    spent,
    limit,
    bar: Math.min(percent, 100),
    state,
    text: left + carried,
  };
}
