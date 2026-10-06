import { Component, effect, inject, signal } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  createOutline,
  timeOutline,
} from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { MonthRecurringExpense } from '../../application/use-cases/get-month-recurring-expenses';
import { SubscriptionCost } from '../../application/use-cases/get-subscription-cost';
import { DebtInstallment } from '../../application/use-cases/get-debt-installments';
import { DineroFormService } from '../dinero/dinero-form.service';
import { PagoModalComponent } from '../deudas/pago.modal';
import { monthOf } from '../../domain/month';
import { RecurringExpense } from '../../domain/recurring-expense';
import {
  dueLabel,
  formatDay,
  formatMoney,
  formatPercent,
  monthLabel,
  todayIso,
} from '../format';
import { MonthSwitcherComponent } from '../month-switcher.component';
import { MonthState } from '../month-state';
import { SuccessCheckComponent } from '../success-check.component';
import { RecurringFormService } from './recurring-form.service';
import { LoadingComponent } from '../loading.component';

/** Solo se muestra la frecuencia cuando no es mensual. */
const FREQUENCY_LABEL: Record<number, string> = {
  1: '',
  3: 'Trimestral',
  6: 'Semestral',
  12: 'Anual',
};

/** Cuánto se ve el check de éxito sobre la tarjeta (design.md, 10.2). */
const FLASH_MS = 1200;

interface Row {
  id: string;
  isIncome: boolean;
  expense: RecurringExpense;
  name: string;
  amount: string;
  paid: boolean;
  detail: string;
  urgent: boolean;
  dueDate: string;
}

interface Totals {
  /** Ingresos fijos del mes aún sin recibir. */
  toReceive: number;
  total: number;
  paid: number;
  pending: number;
  percentPaid: number;
}

@Component({
  selector: 'app-fijos',
  templateUrl: 'fijos.page.html',
  styleUrls: ['fijos.page.scss'],
  imports: [
    LoadingComponent,
    IonContent,
    IonIcon,
    MonthSwitcherComponent,
    SuccessCheckComponent,
  ],
})
export class FijosPage {
  private readonly container = inject(APP_CONTAINER);
  protected readonly monthState = inject(MonthState);
  private readonly form = inject(RecurringFormService);

  protected readonly rows = signal<Row[] | null>(null);
  protected readonly totals = signal<Totals>({
    toReceive: 0,
    total: 0,
    paid: 0,
    pending: 0,
    percentPaid: 0,
  });
  protected readonly paused = signal<RecurringExpense[]>([]);
  protected readonly subscriptions = signal<SubscriptionCost | null>(null);
  protected readonly installments = signal<DebtInstallment[]>([]);
  private readonly dineroForm = inject(DineroFormService);
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
      this.liveMessage.set(
        `${row.name} marcado como ${row.isIncome ? 'recibido' : 'pagado'}`,
      );
      this.monthState.notifyChange();
      setTimeout(() => this.flashId.set(null), FLASH_MS);
    } catch (error) {
      console.error(error);
      this.liveMessage.set(
        `No se pudo marcar ${row.name} como pagado. Inténtalo de nuevo.`,
      );
    } finally {
      this.payingId.set(null);
    }
  }

  protected async resume(expense: RecurringExpense) {
    try {
      await this.container.resumeRecurringExpense.execute(expense.id);
      this.liveMessage.set(`${expense.name} reanudado`);
      this.monthState.notifyChange();
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudo reanudar. Inténtalo de nuevo.');
    }
  }

  protected pausedLabel(expense: RecurringExpense): string {
    return expense.pausedUntil
      ? `En pausa hasta ${monthLabel(expense.pausedUntil)}`
      : '';
  }

  protected installmentDue(c: DebtInstallment) {
    return dueLabel(c.dueDate, todayIso());
  }

  protected payInstallment(c: DebtInstallment) {
    return this.dineroForm.open(PagoModalComponent, { view: c.view });
  }

  private async load(month: string) {
    const seq = ++this.loadSeq;
    try {
      const [items, paused, categories, subscriptions, installments] =
        await Promise.all([
          this.container.getMonthRecurringExpenses.execute(month),
          this.container.getMonthRecurringExpenses.pausedIn(month),
          this.container.categories.list(),
          this.container.getSubscriptionCost.execute(month),
          this.container.getDebtInstallments.execute(month),
        ]);
      if (seq !== this.loadSeq) return;
      this.installments.set(installments);
      this.subscriptions.set(subscriptions.count > 0 ? subscriptions : null);
      const today = todayIso();
      const incomeIds = new Set(
        categories.filter((c) => c.type === 'ingreso').map((c) => c.id),
      );
      this.rows.set(
        items.map((item) =>
          toRow(item, today, incomeIds.has(item.expense.categoryId)),
        ),
      );
      this.paused.set(paused);

      // El resumen es de gastos; los ingresos fijos se cuentan aparte como "por recibir".
      const expenses = items.filter(
        (i) => !incomeIds.has(i.expense.categoryId),
      );
      const total =
        expenses.reduce((s, i) => s + i.instance.amount, 0) +
        installments.reduce((s, c) => s + c.amount, 0);
      const paid =
        expenses
          .filter((i) => i.instance.status === 'pagado')
          .reduce((s, i) => s + i.instance.amount, 0) +
        installments.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0);
      this.totals.set({
        toReceive: items
          .filter(
            (i) =>
              incomeIds.has(i.expense.categoryId) &&
              i.instance.status === 'pendiente',
          )
          .reduce((s, i) => s + i.instance.amount, 0),
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

function toRow(
  { expense, instance }: MonthRecurringExpense,
  today: string,
  isIncome: boolean,
): Row {
  const paid = instance.status === 'pagado';
  const due = paid
    ? {
        text: `${isIncome ? 'Cobro' : 'Vencimiento'} ${formatDay(instance.dueDate)}`,
        urgent: false,
      }
    : dueLabel(instance.dueDate, today, isIncome);
  const every = FREQUENCY_LABEL[expense.frequency ?? 1];
  return {
    id: expense.id,
    isIncome,
    expense,
    name: expense.name,
    amount: `${isIncome ? '+' : ''}${formatMoney(instance.amount)}`,
    paid,
    detail: every ? `${due.text} · ${every}` : due.text,
    urgent: due.urgent,
    dueDate: instance.dueDate,
  };
}
