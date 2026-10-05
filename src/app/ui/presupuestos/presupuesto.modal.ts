import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import {
  AlertController,
  IonContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { NotFoundError, ValidationError } from '../../application/errors';
import { Budget } from '../../domain/budget';
import { Category, isExpenseType } from '../../domain/category';
import { CurrencyState } from '../currency-state';
import { amountToInput, parseAmount } from '../format';
import { MonthState } from '../month-state';
import { SuccessCheckComponent } from '../success-check.component';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-presupuesto-modal',
  templateUrl: 'presupuesto.modal.html',
  styleUrls: ['presupuesto.modal.scss'],
  imports: [IonContent, IonIcon, IonInput, IonSelect, IonSelectOption, SuccessCheckComponent],
})
export class PresupuestoModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);
  protected readonly monthState = inject(MonthState);

  /** Si llega, se edita el límite de este presupuesto (la categoría no cambia). */
  @Input() budget?: Budget;
  @Input() taken: string[] = [];

  protected readonly categories = signal<Category[]>([]);
  protected readonly categoryId = signal<string | null>(null);
  protected readonly limit = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly isEdit = signal(false);
  protected readonly categoryName = signal('');

  protected readonly canSave = computed(
    () => this.categoryId() !== null && parseAmount(this.limit()) !== null && !this.saving(),
  );

  constructor() {
    addIcons({ close });
  }

  async ngOnInit() {
    const all = await this.container.categories.list();
    if (this.budget) {
      this.isEdit.set(true);
      this.categoryId.set(this.budget.categoryId);
      this.limit.set(amountToInput(this.budget.limit));
      this.categoryName.set(all.find((c) => c.id === this.budget!.categoryId)?.name ?? 'Categoría');
    } else {
      const taken = new Set(this.taken);
      this.categories.set(all.filter((c) => isExpenseType(c.type) && !taken.has(c.id)));
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
      await this.container.setBudget.execute({
        categoryId,
        month: this.budget?.month ?? this.monthState.month(),
        limit: parseAmount(this.limit()) ?? 0,
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

  protected async confirmDelete() {
    const budget = this.budget;
    if (!budget) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Eliminar presupuesto',
      message: `Se quitará el límite de ${this.categoryName()} en ${this.monthState.label()}. Tus gastos no cambian.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    this.saving.set(true);
    try {
      await this.container.deleteBudget.execute(budget.id);
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo eliminar. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }
}
