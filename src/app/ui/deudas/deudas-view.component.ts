import { Component, computed, effect, inject, signal } from '@angular/core';
import { AlertController, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { DebtView } from '../../application/use-cases/debts';
import {
  amortization,
  AmortizationRow,
  DebtPayment,
  simulateStrategy,
  StrategyResult,
} from '../../domain/debts';
import { addMonths } from '../../domain/month';
import {
  currentMonth,
  formatDay,
  formatMoney,
  monthLabel,
  parseAmount,
} from '../format';
import { MonthState } from '../month-state';
import { DeudaModalComponent } from './deuda.modal';
import { PagoModalComponent } from './pago.modal';
import { DineroFormService } from '../dinero/dinero-form.service';
import { LoadingComponent } from '../loading.component';

const SHORT_MONTH = new Intl.DateTimeFormat('es-DO', {
  month: 'short',
  year: 'numeric',
});

interface Strategies {
  snowball: StrategyResult;
  avalanche: StrategyResult;
  /** Lo mismo sin extra, para mostrar cuánto se ahorra con él. */
  base: StrategyResult;
  /** Deudas sin plazo: no tienen cuota mínima, así que no entran en la simulación. */
  skipped: number;
}

@Component({
  selector: 'app-deudas-view',
  templateUrl: 'deudas-view.component.html',
  styleUrls: ['deudas-view.component.scss'],
  imports: [LoadingComponent, IonIcon],
})
/** Sección Deudas de la pestaña Dinero. */
export class DeudasViewComponent {
  private readonly container = inject(APP_CONTAINER);
  private readonly forms = inject(DineroFormService);
  private readonly alerts = inject(AlertController);
  protected readonly monthState = inject(MonthState);

  protected readonly debts = signal<DebtView[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly liveMessage = signal('');
  /** Deuda con el calendario de cuotas abierto. */
  protected readonly openSchedule = signal<string | null>(null);
  protected readonly extra = signal('');

  protected readonly money = formatMoney;
  protected readonly day = formatDay;

  protected readonly totals = computed(() => {
    const list = this.debts() ?? [];
    const sum = (dir: string) =>
      list
        .filter((d) => d.debt.direction === dir)
        .reduce((s, d) => s + d.balance, 0);
    return { owe: sum('debo'), owed: sum('me_deben') };
  });

  protected readonly strategies = computed<Strategies | null>(() => {
    const mine = (this.debts() ?? []).filter(
      (d) => d.debt.direction === 'debo' && d.balance > 0,
    );
    const usable = mine.filter((d) => d.installment > 0);
    if (usable.length < 2) return null;
    const input = usable.map((d) => ({
      id: d.debt.id,
      balance: d.balance,
      annualRate: d.debt.annualRate,
      minPayment: d.installment,
    }));
    const extra = parseAmount(this.extra()) ?? 0;
    return {
      snowball: simulateStrategy(input, extra, 'bola_de_nieve'),
      avalanche: simulateStrategy(input, extra, 'avalancha'),
      base: simulateStrategy(input, 0, 'avalancha'),
      skipped: mine.length - usable.length,
    };
  });

  constructor() {
    addIcons({ createOutline });
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected percentPaid(d: DebtView): number {
    return Math.min(
      100,
      Math.max(0, ((d.debt.principal - d.balance) / d.debt.principal) * 100),
    );
  }

  protected detail(d: DebtView): string {
    const parts = [
      d.debt.annualRate > 0 ? `${d.debt.annualRate}% anual` : 'Sin interés',
    ];
    if (d.installment > 0 && d.debt.termMonths) {
      parts.push(`cuota ${formatMoney(d.installment)} × ${d.debt.termMonths}`);
      parts.push(
        `termina en ${monthLabel(addMonths(d.debt.startDate.slice(0, 7), d.debt.termMonths))}`,
      );
    }
    parts.push(`desde ${formatDay(d.debt.startDate)}`);
    return parts.join(' · ');
  }

  protected schedule(d: DebtView): AmortizationRow[] {
    return amortization(d.debt.principal, d.debt.annualRate, d.debt.termMonths);
  }

  /** Mes de la cuota n: la primera vence el mes siguiente al inicio. */
  protected scheduleMonth(d: DebtView, n: number): string {
    const [y, m] = addMonths(d.debt.startDate.slice(0, 7), n)
      .split('-')
      .map(Number);
    return SHORT_MONTH.format(new Date(y, m - 1, 1));
  }

  protected endLabel(r: StrategyResult): string {
    return r.months === null
      ? 'No se termina de pagar con esos montos'
      : `Terminas en ${monthLabel(addMonths(currentMonth(), r.months - 1))}`;
  }

  /** Con el extra, cuántos meses e intereses se ahorran frente a pagar solo las cuotas (con la mejor estrategia). */
  protected savings(s: Strategies): string {
    const best =
      s.avalanche.totalInterest <= s.snowball.totalInterest
        ? s.avalanche
        : s.snowball;
    if (best.months === null || s.base.months === null) return '';
    const months = s.base.months - best.months;
    const interest = s.base.totalInterest - best.totalInterest;
    if (interest <= 0) return '';
    return `Con ese extra terminas ${months} ${months === 1 ? 'mes' : 'meses'} antes y ahorras ${formatMoney(interest)} de intereses.`;
  }

  protected orderNames(r: StrategyResult): string {
    const names = new Map(
      (this.debts() ?? []).map((d) => [d.debt.id, d.debt.name]),
    );
    return r.order.map((id) => names.get(id) ?? '').join(' → ');
  }

  protected toggleSchedule(id: string) {
    this.openSchedule.set(this.openSchedule() === id ? null : id);
  }

  protected openDebt(view?: DebtView) {
    return this.forms.open(DeudaModalComponent, { debt: view?.debt });
  }

  protected openPayment(view: DebtView) {
    return this.forms.open(PagoModalComponent, { view });
  }

  protected async confirmDeletePayment(view: DebtView, p: DebtPayment) {
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Eliminar pago',
      message: `Se borrará el pago de ${formatMoney(p.amount)} del ${formatDay(p.date)} a ${view.debt.name}${
        p.transactionId ? ', y también su movimiento' : ''
      }.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'destructive') return;
    try {
      await this.container.deleteDebtPayment.execute(p);
      this.liveMessage.set('Pago eliminado');
      this.monthState.notifyChange();
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudo eliminar el pago. Inténtalo de nuevo.');
    }
  }

  private async load() {
    try {
      this.debts.set(await this.container.getDebtsOverview.execute());
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      this.failed.set(true);
    }
  }
}
