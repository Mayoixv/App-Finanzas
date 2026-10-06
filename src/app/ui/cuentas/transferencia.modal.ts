import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { IonContent, IonIcon, IonInput, IonSelect, IonSelectOption, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { NotFoundError, ValidationError } from '../../application/errors';
import { Account, isCard } from '../../domain/account';
import { CurrencyState } from '../currency-state';
import { amountToInput, parseAmount, todayIso } from '../format';
import { SuccessCheckComponent } from '../success-check.component';
import { accountLabel } from './account-choices';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-transferencia-modal',
  templateUrl: 'transferencia.modal.html',
  styleUrls: ['transferencia.modal.scss'],
  imports: [IonContent, IonIcon, IonInput, IonSelect, IonSelectOption, SuccessCheckComponent],
})
export class TransferenciaModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);

  /** Para "Pagar" desde una tarjeta: la tarjeta de destino y lo que falta del estado. */
  @Input() toAccountId?: string;
  @Input() suggestedAmount?: number;

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
  protected readonly accountLabel = accountLabel;

  /** Pagar una tarjeta es una transferencia hacia ella: se dice así para que se entienda. */
  protected readonly isCardPayment = computed(() => {
    const to = this.accounts().find((a) => a.id === this.to());
    return !!to && isCard(to);
  });

  protected readonly canSave = computed(
    () => !!this.from() && !!this.to() && this.from() !== this.to() && parseAmount(this.amount()) !== null && !this.saving(),
  );

  constructor() {
    addIcons({ close });
  }

  async ngOnInit() {
    const active = (await this.container.accounts.list()).filter((a) => !a.archived);
    this.accounts.set(active);
    this.from.set(active.find((a) => !isCard(a))?.id ?? null);
    if (this.toAccountId) this.to.set(this.toAccountId);
    if (this.suggestedAmount) this.amount.set(amountToInput(this.suggestedAmount));
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
      });
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(e instanceof ValidationError || e instanceof NotFoundError ? e.message : 'No se pudo guardar. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }
}
