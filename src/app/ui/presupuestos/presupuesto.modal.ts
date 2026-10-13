import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { CategoryFieldComponent } from '../select/category-field.component';
import {
  AlertController,
  IonContent,
  IonIcon,
  IonInput,
  IonToggle,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { Budget, budgetCategoryIds, budgetName } from '../../domain/budget';
import { Category, isExpenseType } from '../../domain/category';
import { CurrencyState } from '../currency-state';
import { amountToInput, parseAmount } from '../format';
import { MonthState } from '../month-state';
import { lookOf } from '../category-look';
import { SuccessCheckComponent } from '../success-check.component';
import { t, errorText, listText } from '../i18n';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-presupuesto-modal',
  templateUrl: 'presupuesto.modal.html',
  styleUrls: ['presupuesto.modal.scss'],
  imports: [CategoryFieldComponent, IonToggle, IonContent, IonIcon, IonInput, SuccessCheckComponent],
})
export class PresupuestoModalComponent implements OnInit {
  protected readonly t = t;
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);
  protected readonly monthState = inject(MonthState);

  /** Si llega, se edita este presupuesto. */
  @Input() budget?: Budget;
  /** Categorías que ya están en otro presupuesto del mes. */
  @Input() taken: string[] = [];

  /** Categorías de gasto que se pueden usar (sin las de otros presupuestos). */
  private readonly available = signal<Category[]>([]);
  /** Las elegidas para este presupuesto, la principal primero. */
  protected readonly chosen = signal<Category[]>([]);
  /** Lo que se puede agregar todavía: sin las ya elegidas. */
  protected readonly categories = computed(() => {
    const ids = new Set(this.chosen().map((c) => c.id));
    return this.available().filter((c) => !ids.has(c.id));
  });
  /** El campo "Agregar categoría" vuelve a vacío tras cada elección. */
  protected readonly adding = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly limit = signal('');
  protected readonly rollover = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly isEdit = signal(false);
  protected readonly look = lookOf;
  protected readonly autoName = computed(() => {
    const names = this.chosen().map((c) => c.name);
    return names.length < 2 ? '' : listText(names);
  });

  protected readonly canSave = computed(
    () => this.chosen().length > 0 && parseAmount(this.limit()) !== null && !this.saving(),
  );

  constructor() {
    addIcons({ close });
  }

  async ngOnInit() {
    const all = await this.container.categories.list();
    const taken = new Set(this.taken);
    const own = new Set(this.budget ? budgetCategoryIds(this.budget) : []);
    this.available.set(all.filter((c) => isExpenseType(c.type) && (!taken.has(c.id) || own.has(c.id))));
    const b = this.budget;
    if (b) {
      this.isEdit.set(true);
      const byId = new Map(all.map((c) => [c.id, c]));
      this.chosen.set(budgetCategoryIds(b).map((id) => byId.get(id)).filter((c): c is Category => !!c));
      this.name.set(b.name ?? '');
      this.limit.set(amountToInput(b.limit));
      this.rollover.set(!!b.rollover);
    }
  }

  protected add(id: string | null) {
    const category = this.available().find((c) => c.id === id);
    if (category) this.chosen.update((list) => [...list, category]);
    // Se limpia en el siguiente ciclo, para que el campo vuelva a "Agregar otra categoría".
    setTimeout(() => this.adding.set(null));
  }

  protected created(category: Category) {
    this.available.update((list) => [...list, category]);
    this.chosen.update((list) => [...list, category]);
    setTimeout(() => this.adding.set(null));
  }

  protected remove(id: string) {
    this.chosen.update((list) => list.filter((c) => c.id !== id));
  }

  /** Nombre para mostrar en mensajes. */
  private displayName(): string {
    const b = this.budget;
    return b ? budgetName(b, new Map(this.chosen().map((c) => [c.id, c.name])), listText) : '';
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    if (this.chosen().length === 0) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.setBudget.execute({
        id: this.budget?.id,
        categoryIds: this.chosen().map((c) => c.id),
        name: this.chosen().length > 1 ? this.name() : '',
        month: this.budget?.month ?? this.monthState.month(),
        limit: parseAmount(this.limit()) ?? 0,
        rollover: this.rollover(),
      });
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(
        errorText(e, 'common.saveFailed'),
      );
      this.saving.set(false);
    }
  }

  protected async confirmDelete() {
    const budget = this.budget;
    if (!budget) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: t('budget.delete'),
      message: t('budget.deleteMsg', { name: this.displayName(), month: this.monthState.label() }),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        { text: t('common.delete'), role: 'destructive' },
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
      this.error.set(t('common.deleteFailed'));
      this.saving.set(false);
    }
  }
}
