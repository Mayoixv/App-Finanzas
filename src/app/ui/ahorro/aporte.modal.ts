import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { IonContent, IonIcon, IonInput, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { NotFoundError, ValidationError } from '../../application/errors';
import { dateInMonth, monthOf } from '../../domain/month';
import { SavingsGoal } from '../../domain/savings';
import { CurrencyState } from '../currency-state';
import { parseAmount, todayIso } from '../format';
import { MonthState } from '../month-state';
import { SuccessCheckComponent } from '../success-check.component';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-aporte-modal',
  templateUrl: 'aporte.modal.html',
  styleUrls: ['aporte.modal.scss'],
  imports: [IonContent, IonIcon, IonInput, SuccessCheckComponent],
})
export class AporteModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly monthState = inject(MonthState);

  @Input({ required: true }) goal!: SavingsGoal;

  protected readonly amount = signal('');
  protected readonly date = signal(todayIso());
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;

  protected readonly canSave = computed(() => parseAmount(this.amount()) !== null && !this.saving());

  constructor() {
    addIcons({ close });
  }

  ngOnInit() {
    // Si se está viendo otro mes, el aporte se propone en ese mes para que cuente ahí.
    const today = todayIso();
    const month = this.monthState.month();
    if (monthOf(today) !== month) this.date.set(dateInMonth(month, Number(today.slice(8, 10))));
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.addSavingsContribution.execute({
        goalId: this.goal.id,
        date: this.date(),
        amount: parseAmount(this.amount()) ?? 0,
      });
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(
        e instanceof ValidationError || e instanceof NotFoundError
          ? e.message
          : 'No se pudo guardar. Inténtalo de nuevo.',
      );
      this.saving.set(false);
    }
  }
}
