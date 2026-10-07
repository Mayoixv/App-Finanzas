import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { AlertController, IonContent, IonIcon, IonInput, IonToggle, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { NotFoundError, ValidationError } from '../../application/errors';
import { Category, CategoryType, isBuiltIn } from '../../domain/category';
import { CATEGORY_COLORS, CATEGORY_ICONS, ICON_LABEL, lookOf } from '../category-look';
import { SelectFieldComponent, SelectOption } from '../select/select-field.component';
import { SuccessCheckComponent } from '../success-check.component';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

export const TYPE_LABEL: Record<CategoryType, string> = {
  ingreso: 'Ingreso',
  fijo: 'Gasto fijo',
  variable: 'Gasto variable',
};

/** Crear o editar una categoría. Al guardar devuelve la categoría (role 'saved'). */
@Component({
  selector: 'app-categoria-modal',
  templateUrl: 'categoria.modal.html',
  styleUrls: ['categoria.modal.scss'],
  imports: [IonContent, IonIcon, IonInput, IonToggle, SuccessCheckComponent, SelectFieldComponent],
})
export class CategoriaModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);

  /** Si llega, se edita esta categoría (el tipo no cambia). */
  @Input() category?: Category;
  /** Al crear desde un formulario, el tipo ya está decidido. */
  @Input() newType?: CategoryType;

  protected readonly types: CategoryType[] = ['variable', 'fijo', 'ingreso'];
  protected readonly typeLabel = TYPE_LABEL;
  protected readonly icons = CATEGORY_ICONS;
  protected readonly iconLabel = ICON_LABEL;
  protected readonly colors = CATEGORY_COLORS;
  protected readonly name = signal('');
  protected readonly type = signal<CategoryType>('variable');
  protected readonly icon = signal<string | undefined>(undefined);
  protected readonly color = signal<string | undefined>(undefined);
  protected readonly hidden = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly isEdit = signal(false);
  protected readonly builtIn = signal(false);
  /** Al borrar una categoría en uso: a cuál pasar sus movimientos. */
  protected readonly moveOptions = signal<SelectOption<string>[] | null>(null);
  protected readonly moveTo = signal<string | null>(null);

  /** Lo que se ve en la vista previa y en los botones marcados. */
  protected readonly look = computed(() => lookOf({ type: this.type(), icon: this.icon(), color: this.color() }));
  protected readonly canSave = computed(() => this.name().trim() !== '' && !this.saving());

  constructor() {
    addIcons({ close });
  }

  ngOnInit() {
    const c = this.category;
    if (c) {
      this.isEdit.set(true);
      this.builtIn.set(isBuiltIn(c));
      this.name.set(c.name);
      this.type.set(c.type);
      this.icon.set(c.icon);
      this.color.set(c.color);
      this.hidden.set(!!c.hidden);
    } else if (this.newType) {
      this.type.set(this.newType);
    }
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    this.saving.set(true);
    this.error.set(null);
    const look = { icon: this.look().icon, color: this.look().color };
    try {
      const saved = this.category
        ? await this.container.updateCategory.execute(this.category.id, { name: this.name(), ...look, hidden: this.hidden() })
        : await this.container.addCategory.execute({ name: this.name(), type: this.type(), ...look });
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(saved, 'saved');
    } catch (e) {
      this.error.set(
        e instanceof ValidationError || e instanceof NotFoundError
          ? e.message
          : 'No se pudo guardar. Inténtalo de nuevo.',
      );
      this.saving.set(false);
    }
  }

  /** Primer toque: si la categoría se usa, pide a cuál pasar sus movimientos; si no, confirma y borra. */
  protected async startDelete() {
    const category = this.category;
    if (!category) return;
    this.error.set(null);
    if (await this.container.categories.isInUse(category.id)) {
      const others = (await this.container.categories.list()).filter((c) => c.type === category.type && c.id !== category.id);
      this.moveOptions.set(others.map((c) => ({ value: c.id, label: c.name, ...lookOf(c) })));
      return;
    }
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Eliminar categoría',
      message: `Se eliminará ${category.name}. Si tiene presupuestos, también se borran.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'destructive') await this.delete();
  }

  protected async delete() {
    const category = this.category;
    if (!category) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.deleteCategory.execute(category.id, this.moveTo() ?? undefined);
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (e) {
      this.error.set(e instanceof ValidationError ? e.message : 'No se pudo eliminar. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }
}
