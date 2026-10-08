import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_CONTAINER } from '../../app.container';
import { MonthRecurringExpense } from '../../application/use-cases/get-month-recurring-expenses';
import { currentMonth, dueLabel, formatMoney, todayIso } from '../format';
import { MonthState } from '../month-state';

interface Row {
  key: string;
  name: string;
  detail: string;
  urgent: boolean;
  overdue: boolean;
  amount: string;
  isIncome: boolean;
  month: string;
}

/** Fijos que vencen en los próximos 7 días (y los vencidos del mes). Solo se ve en el mes actual. */
@Component({
  selector: 'app-upcoming-card',
  templateUrl: 'upcoming-card.component.html',
  styleUrls: ['upcoming-card.component.scss'],
})
export class UpcomingCardComponent {
  private readonly container = inject(APP_CONTAINER);
  private readonly router = inject(Router);
  private readonly monthState = inject(MonthState);

  protected readonly rows = signal<Row[]>([]);
  protected readonly visible = computed(() => this.monthState.month() === currentMonth() && this.rows().length > 0);

  constructor() {
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected open(row: Row) {
    this.monthState.set(row.month);
    this.router.navigateByUrl('/tabs/fijos');
  }

  private async load() {
    try {
      const today = todayIso();
      const [items, categories] = await Promise.all([
        this.container.getUpcomingRecurring.execute(today),
        this.container.categories.list(),
      ]);
      const income = new Set(categories.filter((c) => c.type === 'ingreso').map((c) => c.id));
      this.rows.set(items.map((i) => toRow(i, today, income.has(i.expense.categoryId))));
    } catch (error) {
      // Es una tarjeta de ayuda: si falla, no se muestra y el resto de Inicio sigue funcionando.
      console.error(error);
      this.rows.set([]);
    }
  }
}

function toRow({ expense, instance }: MonthRecurringExpense, today: string, isIncome: boolean): Row {
  const due = dueLabel(instance.dueDate, today, isIncome);
  return {
    key: `${expense.id}-${instance.month}`,
    name: expense.name,
    detail: due.text,
    urgent: due.urgent,
    overdue: !isIncome && due.overdue,
    amount: `${isIncome ? '+' : ''}${formatMoney(instance.amount)}`,
    isIncome,
    month: instance.month,
  };
}
