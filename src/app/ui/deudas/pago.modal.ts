import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { DateFieldComponent } from '../select/date-field.component';
import { IonContent, IonIcon, IonInput, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { NotFoundError, ValidationError } from '../../application/errors';
import { DebtView } from '../../application/use-cases/debts';
import { splitPayment } from '../../domain/debts';
import { CurrencyState } from '../currency-state';
import { amountToInput, formatMoney, parseAmount, todayIso } from '../format';
import { SuccessCheckComponent } from '../success-check.component';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-pago-modal',
  templateUrl: 'pago.modal.html',
  styleUrls: ['pago.modal.scss'],
  imports: [DateFieldComponent, IonContent, IonIcon, IonInput, SuccessCheckComponent],
})
export class PagoModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);

  @Input({ required: true }) view!: DebtView;

  protected readonly amount = signal('');
  protected readonly date = signal(todayIso());
  protected readonly asMovement = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;

  protected readonly canSave = computed(() => parseAmount(this.amount()) !== null && !this.saving());

  /** Cómo se reparte el pago: primero el interés del mes sobre el saldo, el resto baja el saldo. */
  protected readonly preview = computed(() => {
    const amount = parseAmount(this.amount());
    if (!amount) return '';
    const { interest, principal } = splitPayment(this.view.balance, this.view.debt.annualRate, amount);
    return `Interés ${formatMoney(interest)} · capital ${formatMoney(principal)} · queda ${formatMoney(this.view.balance - principal)}`;
  });

  constructor() {
    addIcons({ close });
  }

  ngOnInit() {
    const { installment, balance } = this.view;
    if (installment > 0) this.amount.set(amountToInput(Math.min(installment, balance + this.interestNow())));
  }

  protected get isCollect() {
    return this.view.debt.direction === 'me_deben';
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.registerDebtPayment.execute(
        this.view.debt.id,
        this.date(),
        parseAmount(this.amount()) ?? 0,
        this.asMovement(),
      );
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(
        e instanceof ValidationError || e instanceof NotFoundError ? e.message : 'No se pudo guardar. Inténtalo de nuevo.',
      );
      this.saving.set(false);
    }
  }

  private interestNow(): number {
    return splitPayment(this.view.balance, this.view.debt.annualRate, Number.MAX_SAFE_INTEGER).interest;
  }
}
