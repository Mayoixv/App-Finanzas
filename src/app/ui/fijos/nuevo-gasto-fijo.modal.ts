import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  AlertController,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { NotFoundError, ValidationError } from '../../application/errors';
import { Category } from '../../domain/category';
import { RecurringExpense } from '../../domain/recurring-expense';
import { CurrencyState } from '../currency-state';
import { amountToInput, parseAmount } from '../format';
import { MonthState } from '../month-state';
import { SuccessCheckComponent } from '../success-check.component';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-nuevo-gasto-fijo',
  templateUrl: 'nuevo-gasto-fijo.modal.html',
  styleUrls: ['nuevo-gasto-fijo.modal.scss'],
  imports: [IonContent, IonIcon, IonInput, IonSelect, IonSelectOption, SuccessCheckComponent],
})
export class NuevoGastoFijoModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly monthState = inject(MonthState);
  private readonly alerts = inject(AlertController);

  /** Si llega, el formulario edita este gasto fijo en vez de crear uno. */
  @Input() expense?: RecurringExpense;

  protected readonly categories = signal<Category[]>([]);
  protected readonly name = signal('');
  protected readonly amount = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly dueDay = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly isEdit = signal(false);
  protected readonly monthLabel = this.monthState.label;

  protected readonly canSave = computed(
    () =>
      this.name().trim() !== '' &&
      parseAmount(this.amount()) !== null &&
      this.categoryId() !== null &&
      Number(this.dueDay()) >= 1 &&
      !this.saving(),
  );

  constructor() {
    addIcons({ close });
  }

  async ngOnInit() {
    const all = await this.container.categories.list();
    this.categories.set(all.filter((c) => c.type === 'fijo'));

    const e = this.expense;
    if (e) {
      this.isEdit.set(true);
      this.name.set(e.name);
      this.amount.set(amountToInput(e.amount));
      this.categoryId.set(e.categoryId);
      this.dueDay.set(String(e.dueDay));
    }
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    const categoryId = this.categoryId();
    if (!categoryId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const fields = {
        name: this.name(),
        amount: parseAmount(this.amount()) ?? 0,
        categoryId,
        dueDay: Number(this.dueDay()),
      };
      if (this.expense) {
        await this.container.updateRecurringExpense.execute(
          this.expense.id,
          fields,
          this.monthState.month(),
        );
      } else {
        await this.container.addRecurringExpense.execute({
          ...fields,
          startMonth: this.monthState.month(),
        });
      }
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

  protected async confirmDelete() {
    const e = this.expense;
    if (!e) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Eliminar gasto fijo',
      message: `${e.name} dejará de aparecer desde ${this.monthState.label()} en adelante. Los pagos ya registrados se conservan.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.removeRecurringExpense.execute(e.id, this.monthState.month());
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo eliminar. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }
}
