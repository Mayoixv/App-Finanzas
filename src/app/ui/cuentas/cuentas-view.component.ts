import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { AlertController, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward, swapHorizontal } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { AccountView, CardStatus } from '../../application/use-cases/accounts';
import { CARD_UTILIZATION_WARNING, isCard, Transfer } from '../../domain/account';
import { DineroFormService } from '../dinero/dinero-form.service';
import { amountToInput, currentMonth, formatDay, formatMoney, formatPercent, monthLabel, parseAmount, todayIso } from '../format';
import { MonthState } from '../month-state';
import { ACCOUNT_TYPE_LABEL } from './account-choices';

interface Row {
  view: AccountView;
  name: string;
  detail: string;
  balance: string;
  negative: boolean;
  /** Solo tarjetas: estado del último corte. */
  status?: CardStatus;
  statusText?: string;
  urgent?: boolean;
  highUse?: boolean;
}

/** Secciones Cuentas y Tarjetas de la pestaña Dinero (misma carga, distinto contenido). */
@Component({
  selector: 'app-cuentas-view',
  templateUrl: 'cuentas-view.component.html',
  styleUrls: ['cuentas-view.component.scss'],
  imports: [IonIcon],
})
export class CuentasViewComponent {
  private readonly container = inject(APP_CONTAINER);
  protected readonly forms = inject(DineroFormService);
  private readonly alerts = inject(AlertController);
  protected readonly monthState = inject(MonthState);

  readonly mode = input<'cuentas' | 'tarjetas'>('cuentas');

  private readonly views = signal<AccountView[] | null>(null);
  protected readonly transfers = signal<Transfer[]>([]);
  private readonly cardStatuses = signal<CardStatus[]>([]);
  protected readonly failed = signal(false);
  protected readonly showArchived = signal(false);
  protected readonly liveMessage = signal('');
  protected readonly money = formatMoney;
  protected readonly day = formatDay;
  protected readonly monthName = monthLabel(currentMonth());

  protected readonly loaded = computed(() => this.views() !== null);
  private readonly ofMode = computed(() =>
    (this.views() ?? []).filter((v) => isCard(v.account) === (this.mode() === 'tarjetas')),
  );
  protected readonly rows = computed(() => {
    const statuses = new Map(this.cardStatuses().map((c) => [c.account.id, c]));
    return this.ofMode()
      .filter((v) => !v.account.archived)
      .map((v) => withStatus(toRow(v), statuses.get(v.account.id)));
  });
  protected readonly archived = computed(() => this.ofMode().filter((v) => v.account.archived).map(toRow));
  protected readonly canTransfer = computed(() => (this.views() ?? []).filter((v) => !v.account.archived).length > 1);
  private readonly names = computed(() => new Map((this.views() ?? []).map((v) => [v.account.id, v.account.name])));

  constructor() {
    addIcons({ chevronForward, swapHorizontal });
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected transferText(t: Transfer): string {
    const n = this.names();
    return `${n.get(t.fromAccountId) ?? 'Cuenta'} → ${n.get(t.toAccountId) ?? 'Cuenta'}`;
  }

  protected openAccount(view: AccountView) {
    return this.forms.openAccount(view);
  }

  protected openTransfer() {
    return this.forms.openTransfer();
  }

  protected payCard(r: Row) {
    return this.forms.openTransfer(r.view.account.id, r.status?.pending || r.status?.currentDebt);
  }

  /** El pago mínimo lo fija el banco en cada estado: se anota a mano y vale solo para ese corte. */
  protected async askMinimum(r: Row) {
    const status = r.status;
    if (!status) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Pago mínimo',
      message: `Lo que dice el estado de ${r.name} del corte del ${formatDay(status.lastCut)}. Déjalo vacío para quitarlo.`,
      inputs: [
        {
          name: 'min',
          type: 'number',
          placeholder: '0.00',
          value: status.minimum ? amountToInput(status.minimum) : '',
          attributes: { inputmode: 'decimal', min: 0 },
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    const text = String(data?.values?.min ?? '').trim();
    const amount = text ? parseAmount(text) : null;
    if (text && amount === null) {
      this.liveMessage.set('Monto no válido.');
      return;
    }
    try {
      await this.container.setCardMinimum.execute(r.view.account.id, status.lastCut, amount);
      this.monthState.notifyChange();
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudo guardar el pago mínimo.');
    }
  }

  private async load() {
    try {
      const [overview, transfers, cards] = await Promise.all([
        this.container.getAccountsOverview.execute(),
        this.container.accounts.listTransfers(currentMonth()),
        this.container.getCardStatuses.execute(todayIso()),
      ]);
      this.cardStatuses.set(cards);
      this.transfers.set(transfers);
      this.views.set(overview.accounts);
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      this.failed.set(true);
    }
  }
}

function toRow(view: AccountView): Row {
  const a = view.account;
  let detail = ACCOUNT_TYPE_LABEL[a.type];
  if (isCard(a) && a.creditLimit) {
    const used = Math.max(0, -view.balance);
    detail = `Usado ${formatPercent((used / a.creditLimit) * 100)} de ${formatMoney(a.creditLimit)} · corte día ${a.cutDay}, pago día ${a.dueDay}`;
  }
  return {
    view,
    name: a.name,
    detail,
    // En una tarjeta se muestra lo que se debe, sin signo.
    balance: formatMoney(isCard(a) ? Math.max(0, -view.balance) : view.balance),
    negative: !isCard(a) && view.balance < 0,
  };
}

function withStatus(row: Row, status: CardStatus | undefined): Row {
  if (!status) return row;
  const cut = formatDay(status.lastCut);
  const due = formatDay(status.dueDate);
  let statusText: string;
  if (status.statementDebt === 0) statusText = `Nada que pagar del corte del ${cut}`;
  else if (status.pending === 0) statusText = `Estado del ${cut} pagado`;
  else if (status.daysToDue < 0) statusText = `Venció el ${due}: falta ${formatMoney(status.pending)} del corte del ${cut}`;
  else statusText = `Paga ${formatMoney(status.pending)} antes del ${due} (corte del ${cut})`;
  if (status.cycleCharges > 0) statusText += ` · ${formatMoney(status.cycleCharges)} en compras nuevas`;
  return {
    ...row,
    status,
    statusText,
    urgent: status.pending > 0 && status.daysToDue <= 3,
    highUse: (status.utilization ?? 0) >= CARD_UTILIZATION_WARNING,
  };
}
