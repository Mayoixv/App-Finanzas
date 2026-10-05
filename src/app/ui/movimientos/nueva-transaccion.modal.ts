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
import { ValidationError } from '../../application/errors';
import { Category, isExpenseType } from '../../domain/category';
import { Transaction } from '../../domain/transaction';
import { amountToInput, parseAmount, todayIso } from '../format';
import { CurrencyState } from '../currency-state';
import { SuccessCheckComponent } from '../success-check.component';

type Kind = 'gasto' | 'ingreso';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-nueva-transaccion',
  templateUrl: 'nueva-transaccion.modal.html',
  styleUrls: ['nueva-transaccion.modal.scss'],
  imports: [
    IonContent,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    SuccessCheckComponent,
  ],
})
export class NuevaTransaccionModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);

  /** Si llega, el formulario edita este movimiento en vez de crear uno. */
  @Input() transaction?: Transaction;
  /** Si llega, el formulario crea un movimiento nuevo con estos datos (Duplicar); la fecha queda en hoy. */
  @Input() copyOf?: Transaction;

  private readonly categories = signal<Category[]>([]);
  protected readonly kind = signal<Kind>('gasto');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly amount = signal('');
  protected readonly date = signal(todayIso());
  protected readonly note = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly isEdit = signal(false);
  protected readonly isCopy = signal(false);

  protected readonly options = computed(() =>
    this.categories().filter((c) =>
      this.kind() === 'ingreso' ? c.type === 'ingreso' : isExpenseType(c.type),
    ),
  );

  protected readonly saveLabel = computed(() => {
    if (this.isEdit()) return 'Guardar cambios';
    return this.kind() === 'ingreso' ? 'Guardar ingreso' : 'Guardar gasto';
  });

  protected readonly doneMessage = computed(() => {
    if (this.isEdit()) return 'Cambios guardados';
    return this.kind() === 'ingreso' ? 'Ingreso guardado' : 'Gasto guardado';
  });

  protected readonly canSave = computed(
    () => parseAmount(this.amount()) !== null && this.categoryId() !== null && !this.saving(),
  );

  constructor() {
    addIcons({ close });
  }

  async ngOnInit() {
    const categories = await this.container.categories.list();
    this.categories.set(categories);

    const t = this.transaction ?? this.copyOf;
    if (t) {
      const category = categories.find((c) => c.id === t.categoryId);
      this.isEdit.set(!!this.transaction);
      this.isCopy.set(!this.transaction);
      this.kind.set(category?.type === 'ingreso' ? 'ingreso' : 'gasto');
      this.categoryId.set(t.categoryId);
      this.amount.set(amountToInput(t.amount));
      if (this.transaction) this.date.set(t.date);
      this.note.set(t.note);
    }
  }

  protected setKind(value: unknown) {
    this.kind.set(value === 'ingreso' ? 'ingreso' : 'gasto');
    this.categoryId.set(null);
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
      const input = {
        date: this.date(),
        amount: parseAmount(this.amount()) ?? 0,
        categoryId,
        note: this.note(),
      };
      if (this.transaction) {
        await this.container.updateTransaction.execute(this.transaction.id, input);
      } else {
        await this.container.addTransaction.execute(input);
      }
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(
        e instanceof ValidationError ? e.message : 'No se pudo guardar. Inténtalo de nuevo.',
      );
      this.saving.set(false);
    }
  }

  protected async confirmDelete() {
    const t = this.transaction;
    if (!t) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Eliminar movimiento',
      message: 'Se borrará este movimiento. Si era el pago de un gasto fijo, ese gasto volverá a quedar pendiente.',
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
      await this.container.deleteTransaction.execute(t.id);
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (e) {
      console.error(e);
      this.error.set('No se pudo eliminar. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }
}
