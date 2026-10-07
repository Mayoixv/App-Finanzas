import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { Category, CategoryType } from '../../domain/category';
import { lookOf } from '../category-look';
import { MonthState } from '../month-state';
import { CategoriaModalComponent } from './categoria.modal';

interface Group {
  type: CategoryType;
  title: string;
  items: Category[];
}

const GROUPS: { type: CategoryType; title: string }[] = [
  { type: 'ingreso', title: 'Ingresos' },
  { type: 'fijo', title: 'Gastos fijos' },
  { type: 'variable', title: 'Gastos variables' },
];

/** Ajustes › Categorías: crear, editar, ocultar y borrar categorías. */
@Component({
  selector: 'app-categorias',
  templateUrl: 'categorias.page.html',
  styleUrls: ['ajustes.page.scss'],
  imports: [RouterLink, IonContent, IonIcon],
})
export class CategoriasPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly modals = inject(ModalController);
  private readonly monthState = inject(MonthState);

  protected readonly look = lookOf;
  private readonly categories = signal<Category[] | null>(null);
  protected readonly failed = signal(false);
  private modalOpen = false;

  protected readonly groups = computed<Group[]>(() => {
    const all = this.categories() ?? [];
    return GROUPS.map((g) => ({
      ...g,
      items: all.filter((c) => c.type === g.type).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }));
  });

  constructor() {
    addIcons({ chevronBack, chevronForward });
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected async openCategory(category?: Category) {
    if (this.modalOpen) return;
    this.modalOpen = true;
    try {
      const modal = await this.modals.create({ component: CategoriaModalComponent, componentProps: { category } });
      await modal.present();
      await modal.onWillDismiss();
      this.monthState.notifyChange();
    } finally {
      this.modalOpen = false;
    }
  }

  private async load() {
    try {
      this.categories.set(await this.container.categories.list());
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      this.failed.set(true);
    }
  }
}
