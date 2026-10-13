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
import { t, locale } from '../i18n';

interface Group {
  type: CategoryType;
  items: Category[];
}

const GROUPS: CategoryType[] = ['ingreso', 'fijo', 'variable'];

/** Ajustes › Categorías: crear, editar, ocultar y borrar categorías. */
@Component({
  selector: 'app-categorias',
  templateUrl: 'categorias.page.html',
  styleUrls: ['ajustes.page.scss'],
  imports: [RouterLink, IonContent, IonIcon],
})
export class CategoriasPage {
  protected readonly t = t;
  private readonly container = inject(APP_CONTAINER);
  private readonly modals = inject(ModalController);
  private readonly monthState = inject(MonthState);

  protected readonly look = lookOf;
  private readonly categories = signal<Category[] | null>(null);
  protected readonly failed = signal(false);
  private modalOpen = false;

  protected readonly groups = computed<Group[]>(() => {
    const all = this.categories() ?? [];
    return GROUPS.map((type) => ({
      type,
      items: all.filter((c) => c.type === type).sort((a, b) => a.name.localeCompare(b.name, locale())),
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
