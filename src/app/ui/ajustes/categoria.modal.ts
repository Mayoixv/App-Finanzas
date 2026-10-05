import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { AlertController, IonContent, IonIcon, IonInput, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { NotFoundError, ValidationError } from '../../application/errors';
import { Category, CategoryType } from '../../domain/category';
import { SuccessCheckComponent } from '../success-check.component';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

export const TYPE_LABEL: Record<CategoryType, string> = {
  ingreso: 'Ingreso',
  fijo: 'Gasto fijo',
  variable: 'Gasto variable',
};

@Component({
  selector: 'app-categoria-modal',
  templateUrl: 'categoria.modal.html',
  styleUrls: ['categoria.modal.scss'],
  imports: [IonContent, IonIcon, IonInput, SuccessCheckComponent],
})
export class CategoriaModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);

  /** Si llega, se renombra esta categoría (el tipo no cambia). */
  @Input() category?: Category;

  protected readonly types: CategoryType[] = ['variable', 'fijo', 'ingreso'];
  protected readonly typeLabel = TYPE_LABEL;
  protected readonly name = signal('');
  protected readonly type = signal<CategoryType>('variable');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly isEdit = signal(false);

  protected readonly canSave = computed(() => this.name().trim() !== '' && !this.saving());

  constructor() {
    addIcons({ close });
  }

  ngOnInit() {
    if (this.category) {
      this.isEdit.set(true);
      this.name.set(this.category.name);
      this.type.set(this.category.type);
    }
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.category) await this.container.renameCategory.execute(this.category.id, this.name());
      else await this.container.addCategory.execute({ name: this.name(), type: this.type() });
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
    const category = this.category;
    if (!category) return;
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
    if (role !== 'destructive') return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.deleteCategory.execute(category.id);
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (e) {
      this.error.set(e instanceof ValidationError ? e.message : 'No se pudo eliminar. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }
}
