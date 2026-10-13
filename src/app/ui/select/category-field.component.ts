import { Component, computed, inject, input, model, output } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Category, CategoryType } from '../../domain/category';
import { CategoriaModalComponent } from '../ajustes/categoria.modal';
import { lookOf } from '../category-look';
import { SelectFieldComponent, SelectOption } from './select-field.component';
import { t } from '../i18n';

/**
 * Elegir categoría, con ícono y color, y crear una nueva desde la misma hoja.
 * Las ocultas no se ofrecen, salvo la que ya estaba elegida (al editar algo antiguo).
 */
@Component({
  selector: 'app-category-field',
  template: `
    <app-select-field
      [label]="label()"
      [placeholder]="placeholder()"
      [title]="t('fields.chooseCategory')"
      [action]="t('fields.newCategory')"
      [options]="options()"
      [disabled]="disabled()"
      [(value)]="value"
      (actionPicked)="create()"
    ></app-select-field>
  `,
  imports: [SelectFieldComponent],
})
export class CategoryFieldComponent {
  protected readonly t = t;
  private readonly modals = inject(ModalController);

  readonly categories = input.required<Category[]>();
  /** Tipo de las categorías que se crean desde aquí. */
  readonly newType = input.required<CategoryType>();
  readonly label = input(t('fields.category'));
  readonly placeholder = input(t('fields.chooseCategory'));
  readonly disabled = input(false);
  readonly value = model<string | null>(null);
  /** Se creó una categoría: el padre la agrega a su lista (ya queda elegida). */
  readonly created = output<Category>();

  protected readonly options = computed<SelectOption<string>[]>(() =>
    this.categories()
      .filter((c) => !c.hidden || c.id === this.value())
      .map((c) => ({ value: c.id, label: c.name, ...lookOf(c) })),
  );

  protected async create() {
    const modal = await this.modals.create({ component: CategoriaModalComponent, componentProps: { newType: this.newType() } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<Category>();
    if (role !== 'saved' || !data) return;
    this.created.emit(data);
    this.value.set(data.id);
  }
}
