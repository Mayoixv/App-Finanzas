import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { DeudaModalComponent } from '../deudas/deuda.modal';
import { SelectSheetComponent } from '../select/select-sheet.component';
import { SelectFieldComponent } from '../select/select-field.component';
import { CategoryFieldComponent } from '../select/category-field.component';
import {
  IonContent,
  IonIcon,
  IonInput,
  AlertController,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { Account, CASH_ACCOUNT_ID } from '../../domain/account';
import { accountChoices, accountOptions } from '../cuentas/account-choices';
import { APP_CONTAINER } from '../../app.container';
import { NotFoundError, ValidationError } from '../../application/errors';
import { Category } from '../../domain/category';
import { Frequency, RecurringExpense } from '../../domain/recurring-expense';
import { CurrencyState } from '../currency-state';
import { amountToInput, parseAmount } from '../format';
import { MonthState } from '../month-state';
import { SuccessCheckComponent } from '../success-check.component';
import { DayPickerComponent, LAST_DAY } from '../day-picker.component';
import { paymentName } from '../../application/use-cases/add-recurring-expense';

/** Cuántas veces se cobra al mes un ingreso. Cada cobro se guarda como un fijo aparte. */
type PayMode = 'una' | 'quincenal' | 'otra';
interface Payment {
  day: number | null;
  amount: string;
}
/** Más de 4 cobros al mes ya es otra cosa (semanal): no se ofrece. */
const MAX_PAYMENTS = 4;

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-nuevo-gasto-fijo',
  templateUrl: 'nuevo-gasto-fijo.modal.html',
  styleUrls: ['nuevo-gasto-fijo.modal.scss'],
  imports: [SelectFieldComponent, CategoryFieldComponent, IonContent, IonIcon, IonInput, SuccessCheckComponent, DayPickerComponent],
})
export class NuevoGastoFijoModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly monthState = inject(MonthState);
  private readonly alerts = inject(AlertController);

  /** Si llega, el formulario edita este gasto fijo en vez de crear uno. */
  @Input() expense?: RecurringExpense;

  private readonly allCategories = signal<Category[]>([]);
  /** Un fijo puede ser un gasto (alquiler) o un ingreso (sueldo); lo decide su categoría. */
  protected readonly kind = signal<'gasto' | 'ingreso'>('gasto');
  protected readonly categories = computed(() =>
    // Un gasto fijo puede ser de cualquier categoría de gasto (por ejemplo RD$15,000 de comida al mes);
    // primero las de gasto fijo, luego las variables.
    this.kind() === 'ingreso'
      ? this.allCategories().filter((c) => c.type === 'ingreso')
      : [
          ...this.allCategories().filter((c) => c.type === 'fijo'),
          ...this.allCategories().filter((c) => c.type === 'variable'),
        ],
  );
  protected readonly frequency = signal<Frequency>(1);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly accountId = signal(CASH_ACCOUNT_ID);
  protected readonly accountOptions = computed(() => accountOptions(this.accounts()));
  protected readonly frequencies: { value: Frequency; label: string }[] = [
    { value: 1, label: 'Cada mes' },
    { value: 3, label: 'Cada 3 meses' },
    { value: 6, label: 'Cada 6 meses' },
    { value: 12, label: 'Cada año' },
  ];
  /** Está en pausa en el mes que se ve: se ofrece reanudar en vez de pausar. */
  protected readonly isPaused = computed(() => {
    const until = this.expense?.pausedUntil;
    return !!until && this.monthState.month() <= until;
  });
  protected readonly name = signal('');
  protected readonly amount = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly dueDay = signal<number | null>(null);
  protected readonly payMode = signal<PayMode>('una');
  protected readonly payments = signal<Payment[]>([]);
  protected readonly maxPayments = MAX_PAYMENTS;
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly isEdit = signal(false);
  protected readonly monthLabel = this.monthState.label;
  /** Varios cobros solo al crear un ingreso; luego cada cobro se edita por separado. */
  protected readonly multi = computed(() => this.kind() === 'ingreso' && !this.isEdit() && this.payMode() !== 'una');

  protected readonly canSave = computed(
    () =>
      this.name().trim() !== '' &&
      this.categoryId() !== null &&
      (this.multi()
        ? this.payments().every((p) => p.day !== null && parseAmount(p.amount) !== null)
        : this.dueDay() !== null && parseAmount(this.amount()) !== null) &&
      !this.saving(),
  );

  constructor() {
    addIcons({ close });
  }

  async ngOnInit() {
    const all = await this.container.categories.list();
    this.allCategories.set(all);
    const choices = await accountChoices(this.container, this.expense?.accountId);
    this.accounts.set(choices.accounts);
    this.accountId.set(choices.selected);

    const e = this.expense;
    if (e) {
      this.isEdit.set(true);
      this.name.set(e.name);
      this.amount.set(amountToInput(e.amount));
      this.categoryId.set(e.categoryId);
      this.dueDay.set(e.dueDay);
      this.frequency.set(e.frequency ?? 1);
      if (all.find((c) => c.id === e.categoryId)?.type === 'ingreso') this.kind.set('ingreso');
    }
  }

  protected addCategory(c: Category) {
    this.allCategories.update((list) => [...list, c]);
  }

  protected setKind(kind: 'gasto' | 'ingreso') {
    this.kind.set(kind);
    this.categoryId.set(null);
  }

  protected setPayMode(mode: PayMode) {
    this.payMode.set(mode);
    const amount = this.amount();
    if (mode === 'quincenal') this.payments.set([{ day: 15, amount }, { day: LAST_DAY, amount: '' }]);
    if (mode === 'otra') this.payments.set([{ day: this.dueDay(), amount }, { day: null, amount: '' }]);
  }

  protected updatePayment(index: number, change: Partial<Payment>) {
    this.payments.update((list) => list.map((p, i) => (i === index ? { ...p, ...change } : p)));
  }

  protected addPayment() {
    this.payments.update((list) => [...list, { day: null, amount: '' }]);
  }

  protected removePayment(index: number) {
    this.payments.update((list) => list.filter((_, i) => i !== index));
  }

  protected async pause() {
    const e = this.expense;
    if (!e) return;
    const sheet = await this.modalCtrl.create({
      component: SelectSheetComponent,
      componentProps: {
        title: `Pausar desde ${this.monthState.label()}`,
        note: 'Lo pendiente de esos meses se quita; lo ya pagado se queda.',
        options: [1, 2, 3, 6].map((n) => ({ value: n, label: n === 1 ? '1 mes' : `${n} meses` })),
      },
      cssClass: 'select-modal',
    });
    await sheet.present();
    // onDidDismiss: hasta que la hoja termine de cerrarse sigue siendo la ventana de arriba, y run() cierra el formulario.
    const { role, data } = await sheet.onDidDismiss<number>();
    if (role !== 'select' || !data) return;
    await this.run(() => this.container.pauseRecurringExpense.execute(e.id, this.monthState.month(), data));
  }

  protected async resume() {
    const e = this.expense;
    if (e) await this.run(() => this.container.resumeRecurringExpense.execute(e.id));
  }

  private async run(work: () => Promise<unknown>) {
    this.saving.set(true);
    try {
      await work();
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (err) {
      console.error(err);
      this.error.set(err instanceof ValidationError ? err.message : 'No se pudo guardar. Inténtalo de nuevo.');
      this.saving.set(false);
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
      if (this.multi()) {
        await this.container.addRecurringExpenses.execute(
          this.payments().map((p) => ({
            name: paymentName(this.name(), p.day ?? 0),
            amount: parseAmount(p.amount) ?? 0,
            categoryId,
            dueDay: p.day ?? 0,
            accountId: this.accountId(),
            startMonth: this.monthState.month(),
          })),
        );
        return await this.showSaved();
      }
      const fields = {
        name: this.name(),
        amount: parseAmount(this.amount()) ?? 0,
        categoryId,
        dueDay: this.dueDay() ?? 0,
        frequency: this.frequency(),
        accountId: this.accountId(),
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
      await this.showSaved();
    } catch (e) {
      this.error.set(
        e instanceof ValidationError || e instanceof NotFoundError
          ? e.message
          : 'No se pudo guardar. Inténtalo de nuevo.',
      );
      this.saving.set(false);
    }
  }

  private async showSaved() {
    this.saved.set(true);
    await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
    await this.modalCtrl.dismiss(null, 'saved');
  }

  /**
   * Convierte un pago de deuda anotado como fijo en una deuda con saldo. Si la deuda tiene plazo, sus cuotas ya
   * salen en Fijos: se ofrece quitar este fijo para no contar el pago dos veces.
   */
  protected async createDebt() {
    const e = this.expense;
    if (!e) return;
    const form = await this.modalCtrl.create({ component: DeudaModalComponent, componentProps: { presetName: e.name } });
    await form.present();
    if ((await form.onDidDismiss()).role !== 'saved') return;
    const label = this.monthState.label();
    const month = label.charAt(0).toLocaleLowerCase('es') + label.slice(1);
    const alert = await this.alerts.create({
      cssClass: 'app-alert choices',
      header: 'Deuda creada',
      message: `Si le pusiste plazo, sus cuotas ya aparecen en Fijos. ¿Quitas "${e.name}" desde ${month} para no contar el pago dos veces?`,
      buttons: [
        { text: `Quitar desde ${month}`, role: 'forward' },
        { text: 'Dejarlo', role: 'cancel' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'forward') return;
    this.saving.set(true);
    try {
      await this.container.removeRecurringExpense.execute(e.id, this.monthState.month(), 'forward');
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo quitar el fijo. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }

  protected async confirmDelete() {
    const e = this.expense;
    if (!e) return;
    const label = this.monthState.label();
    const month = label.charAt(0).toLocaleLowerCase('es') + label.slice(1);
    const alert = await this.alerts.create({
      cssClass: 'app-alert choices',
      header: `Eliminar ${e.name}`,
      message: `Los pagos ya registrados se quedan en Movimientos.`,
      buttons: [
        { text: `Solo ${month}`, role: 'month' },
        { text: 'Este mes y los siguientes', role: 'forward', cssClass: 'danger' },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'month' && role !== 'forward') return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.removeRecurringExpense.execute(e.id, this.monthState.month(), role);
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo eliminar. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }

}
