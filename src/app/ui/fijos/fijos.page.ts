import { Component, effect, inject, signal } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, createOutline, timeOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { MonthRecurringExpense } from '../../application/use-cases/get-month-recurring-expenses';
import { monthOf } from '../../domain/month';
import { RecurringExpense } from '../../domain/recurring-expense';
import { dueLabel, formatDay, formatMoney, formatPercent, todayIso } from '../format';
import { MonthSwitcherComponent } from '../month-switcher.component';
import { MonthState } from '../month-state';
import { SuccessCheckComponent } from '../success-check.component';
import { RecurringFormService } from './recurring-form.service';

/** Cuánto se ve el check de éxito sobre la tarjeta (design.md, 10.2). */
const FLASH_MS = 1200;

interface Row {
  id: string;
  expense: RecurringExpense;
  name: string;
  amount: string;
  paid: boolean;
  detail: string;
  urgent: boolean;
  dueDate: string;
}

interface Totals {
  total: number;
  paid: number;
  pending: number;
  percentPaid: number;
}

@Component({
  selector: 'app-fijos',
  templateUrl: 'fijos.page.html',
  styleUrls: ['fijos.page.scss'],
  imports: [IonContent, IonIcon, MonthSwitcherComponent, SuccessCheckComponent],
})
export class FijosPage {
  private readonly container = inject(APP_CONTAINER);
  protected readonly monthState = inject(MonthState);
  private readonly form = inject(RecurringFormService);

  protected readonly rows = signal<Row[] | null>(null);
  protected readonly totals = signal<Totals>({ total: 0, paid: 0, pending: 0, percentPaid: 0 });
  protected readonly failed = signal(false);
  protected readonly flashId = signal<string | null>(null);
  protected readonly liveMessage = signal('');
  protected readonly payingId = signal<string | null>(null);
  /** Cada carga lleva un número; si el usuario cambió de mes mientras tanto, la respuesta vieja se descarta. */
  private loadSeq = 0;

  protected readonly money = formatMoney;
  protected readonly percent = formatPercent;

  constructor() {
    addIcons({ checkmarkCircleOutline, createOutline, timeOutline });
    effect(() => {
      const month = this.monthState.month();
      this.monthState.version();
      this.load(month);
    });
  }

  protected edit(row: Row) {
    this.form.open(row.expense);
  }

  protected async pay(row: Row) {
    const month = this.monthState.month();
    const today = todayIso();
    // Si el mes mostrado no es el actual, el pago se anota en el día de vencimiento para que cuente en ese mes.
    const paidDate = monthOf(today) === month ? today : row.dueDate;
    this.payingId.set(row.id);
    try {
      await this.container.payRecurringExpense.execute({
        recurringExpenseId: row.id,
        month,
        paidDate,
      });
      this.flashId.set(row.id);
      this.liveMessage.set(`${row.name} marcado como pagado`);
      this.monthState.notifyChange();
      setTimeout(() => this.flashId.set(null), FLASH_MS);
    } catch (error) {
      console.error(error);
      this.liveMessage.set(`No se pudo marcar ${row.name} como pagado. Inténtalo de nuevo.`);
    } finally {
      this.payingId.set(null);
    }
  }

  private async load(month: string) {
    const seq = ++this.loadSeq;
    try {
      const items = await this.container.getMonthRecurringExpenses.execute(month);
      if (seq !== this.loadSeq) return;
      const today = todayIso();
      this.rows.set(items.map((item) => toRow(item, today)));

      const total = items.reduce((s, i) => s + i.instance.amount, 0);
      const paid = items
        .filter((i) => i.instance.status === 'pagado')
        .reduce((s, i) => s + i.instance.amount, 0);
      this.totals.set({
        total,
        paid,
        pending: total - paid,
        percentPaid: total > 0 ? (paid / total) * 100 : 0,
      });
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      if (seq === this.loadSeq) this.failed.set(true);
    }
  }
}

function toRow({ expense, instance }: MonthRecurringExpense, today: string): Row {
  const paid = instance.status === 'pagado';
  const due = paid ? { text: `Vencimiento ${formatDay(instance.dueDate)}`, urgent: false } : dueLabel(instance.dueDate, today);
  return {
    id: expense.id,
    expense,
    name: expense.name,
    amount: formatMoney(instance.amount),
    paid,
    detail: due.text,
    urgent: due.urgent,
    dueDate: instance.dueDate,
  };
}
