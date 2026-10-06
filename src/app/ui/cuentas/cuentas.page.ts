import { Location } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { AlertController, IonContent, IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, swapHorizontal } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { AccountsOverview, AccountView, CardStatus } from '../../application/use-cases/accounts';
import { CARD_UTILIZATION_WARNING, isCard, Transfer } from '../../domain/account';
import { currentMonth, formatDay, formatMoney, formatPercent, monthLabel, todayIso } from '../format';
import { MonthState } from '../month-state';
import { UndoService } from '../undo.service';
import { ACCOUNT_TYPE_LABEL } from './account-choices';
import { CuentaModalComponent } from './cuenta.modal';
import { TransferenciaModalComponent } from './transferencia.modal';

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

@Component({
  selector: 'app-cuentas',
  templateUrl: 'cuentas.page.html',
  styleUrls: ['cuentas.page.scss'],
  imports: [IonContent, IonIcon],
})
export class CuentasPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly modals = inject(ModalController);
  private readonly alerts = inject(AlertController);
  private readonly location = inject(Location);
  private readonly undo = inject(UndoService);
  protected readonly monthState = inject(MonthState);

  protected readonly overview = signal<AccountsOverview | null>(null);
  protected readonly transfers = signal<Transfer[]>([]);
  private readonly cardStatuses = signal<CardStatus[]>([]);
  protected readonly failed = signal(false);
  protected readonly showArchived = signal(false);
  protected readonly liveMessage = signal('');
  protected readonly money = formatMoney;
  protected readonly day = formatDay;
  protected readonly monthName = monthLabel(currentMonth());
  private opening = false;

  private readonly views = computed(() => this.overview()?.accounts ?? []);
  protected readonly accounts = computed(() => this.views().filter((v) => !v.account.archived && !isCard(v.account)).map(toRow));
  protected readonly cards = computed(() => {
    const statuses = new Map(this.cardStatuses().map((c) => [c.account.id, c]));
    return this.views()
      .filter((v) => !v.account.archived && isCard(v.account))
      .map((v) => withStatus(toRow(v), statuses.get(v.account.id)));
  });
  protected readonly archived = computed(() => this.views().filter((v) => v.account.archived).map(toRow));
  protected readonly canTransfer = computed(() => this.views().filter((v) => !v.account.archived).length > 1);
  private readonly names = computed(() => new Map(this.views().map((v) => [v.account.id, v.account.name])));

  constructor() {
    addIcons({ chevronBack, chevronForward, swapHorizontal });
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected back() {
    this.location.back();
  }

  protected transferText(t: Transfer): string {
    const n = this.names();
    return `${n.get(t.fromAccountId) ?? 'Cuenta'} → ${n.get(t.toAccountId) ?? 'Cuenta'}`;
  }

  protected openAccount(view?: AccountView) {
    return this.open(CuentaModalComponent, { view });
  }

  protected openTransfer() {
    return this.open(TransferenciaModalComponent, {});
  }

  protected payCard(r: Row) {
    return this.open(TransferenciaModalComponent, {
      toAccountId: r.view.account.id,
      suggestedAmount: r.status?.pending || r.status?.currentDebt,
    });
  }

  protected async confirmDeleteTransfer(t: Transfer) {
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Eliminar transferencia',
      message: `Se borrará ${formatMoney(t.amount)} de ${this.transferText(t)} del ${formatDay(t.date)}.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'destructive') return;
    try {
      const removed = await this.container.deleteTransfer.execute(t.id);
      this.monthState.notifyChange();
      if (removed) this.undo.offer('Transferencia eliminada', () => this.container.accounts.saveTransfer(removed));
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudo eliminar la transferencia. Inténtalo de nuevo.');
    }
  }

  private async open(component: unknown, componentProps: Record<string, unknown>) {
    // Un doble toque no debe abrir dos formularios.
    if (this.opening) return;
    this.opening = true;
    try {
      const modal = await this.modals.create({ component: component as never, componentProps });
      await modal.present();
      await modal.onWillDismiss();
      this.monthState.notifyChange();
    } finally {
      this.opening = false;
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
      this.overview.set(overview);
      this.transfers.set(transfers);
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
