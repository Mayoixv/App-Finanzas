import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { DateFieldComponent } from '../select/date-field.component';
import { SelectFieldComponent } from '../select/select-field.component';
import { AlertController, IonContent, IonIcon, IonInput, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, swapVertical } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { Account, isCard, Transfer } from '../../domain/account';
import { UndoService } from '../undo.service';
import { CurrencyState } from '../currency-state';
import { amountToInput, formatMoney, parseAmount, todayIso } from '../format';
import { SuccessCheckComponent } from '../success-check.component';
import { accountOptions } from './account-choices';
import { t, errorText } from '../i18n';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-transferencia-modal',
  templateUrl: 'transferencia.modal.html',
  styleUrls: ['transferencia.modal.scss'],
  imports: [DateFieldComponent, SelectFieldComponent, IonContent, IonIcon, IonInput, SuccessCheckComponent],
})
export class TransferenciaModalComponent implements OnInit {
  protected readonly t = t;
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);
  private readonly undo = inject(UndoService);

  /** Para "Pagar" desde una tarjeta: la tarjeta de destino y lo que falta del estado. */
  @Input() toAccountId?: string;
  @Input() suggestedAmount?: number;
  /** Si llega, el formulario edita esta transferencia (y permite borrarla). */
  @Input() transfer?: Transfer;

  protected readonly accounts = signal<Account[]>([]);
  protected readonly from = signal<string | null>(null);
  protected readonly to = signal<string | null>(null);
  protected readonly amount = signal('');
  protected readonly date = signal(todayIso());
  protected readonly note = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly money = formatMoney;
  /** Saldo de cada cuenta sin esta transferencia (al editar se descuenta lo que ya movía). */
  private readonly balances = signal(new Map<string, number>());
  protected readonly accountOptions = computed(() => accountOptions(this.accounts()));

  /** Cómo quedan las dos cuentas, para ver antes de guardar que el dinero va en la dirección correcta. */
  protected readonly preview = computed(() => {
    const from = this.accounts().find((a) => a.id === this.from());
    const to = this.accounts().find((a) => a.id === this.to());
    const amount = parseAmount(this.amount());
    if (!from || !to || from.id === to.id || amount === null) return null;
    const before = (a: Account) => this.balances().get(a.id) ?? a.initialBalance;
    return [
      { account: from, name: from.name, before: before(from), after: before(from) - amount },
      { account: to, name: to.name, before: before(to), after: before(to) + amount },
    ];
  });

  /** No bloquea (puede ser un sobregiro real), pero avisa: casi siempre es que se eligieron al revés. */
  protected readonly warning = computed(() => {
    const out = this.preview()?.[0];
    if (!out || isCard(out.account) || out.after >= 0) return null;
    return t('transfer.warning', { name: out.name, amount: formatMoney(out.after) });
  });
  protected readonly toOptions = computed(() => this.accountOptions().filter((o) => o.value !== this.from()));

  /** Pagar una tarjeta es una transferencia hacia ella: se dice así para que se entienda. */
  protected readonly isCardPayment = computed(() => {
    const to = this.accounts().find((a) => a.id === this.to());
    return !!to && isCard(to);
  });

  protected readonly canSave = computed(
    () => !!this.from() && !!this.to() && this.from() !== this.to() && parseAmount(this.amount()) !== null && !this.saving(),
  );

  constructor() {
    addIcons({ close, swapVertical });
  }

  async ngOnInit() {
    const tr = this.transfer;
    // Al editar, también las cuentas archivadas que use la transferencia.
    const active = (await this.container.accounts.list()).filter(
      (a) => !a.archived || a.id === tr?.fromAccountId || a.id === tr?.toAccountId,
    );
    this.accounts.set(active);
    const balances = await this.container.accounts.balances();
    if (tr) {
      balances.set(tr.fromAccountId, (balances.get(tr.fromAccountId) ?? 0) + tr.amount);
      balances.set(tr.toAccountId, (balances.get(tr.toAccountId) ?? 0) - tr.amount);
    }
    this.balances.set(balances);
    if (tr) {
      this.from.set(tr.fromAccountId);
      this.to.set(tr.toAccountId);
      this.amount.set(amountToInput(tr.amount));
      this.date.set(tr.date);
      this.note.set(tr.note);
      return;
    }
    this.from.set(active.find((a) => !isCard(a))?.id ?? null);
    if (this.toAccountId) this.to.set(this.toAccountId);
    if (this.suggestedAmount) this.amount.set(amountToInput(this.suggestedAmount));
  }

  protected async confirmDelete() {
    const tr = this.transfer;
    if (!tr) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: t('transfer.delete'),
      message: t('transfer.deleteMsg'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        { text: t('common.delete'), role: 'destructive' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'destructive') return;
    this.saving.set(true);
    try {
      const removed = await this.container.deleteTransfer.execute(tr.id);
      if (removed) this.undo.offer(t('transfer.deleted'), () => this.container.accounts.saveTransfer(removed));
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (e) {
      console.error(e);
      this.error.set(t('common.deleteFailed'));
      this.saving.set(false);
    }
  }

  protected swap() {
    const from = this.from();
    this.from.set(this.to());
    this.to.set(from);
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.saveTransfer.execute({
        date: this.date(),
        amount: parseAmount(this.amount()) ?? 0,
        fromAccountId: this.from()!,
        toAccountId: this.to()!,
        note: this.note(),
      }, this.transfer?.id);
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(errorText(e, 'common.saveFailed'));
      this.saving.set(false);
    }
  }
}
