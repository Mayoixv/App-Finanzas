import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, chevronBack, chevronDown, chevronForward } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { Category, CategoryType } from '../../domain/category';
import { Currency } from '../../domain/currency';
import { CurrencyState } from '../currency-state';
import { DropdownComponent } from '../dropdown.component';
import { MonthState } from '../month-state';
import { CategoriaModalComponent } from './categoria.modal';
import { DatosComponent } from './datos.component';
import { AvisosComponent } from './avisos.component';

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

@Component({
  selector: 'app-ajustes',
  templateUrl: 'ajustes.page.html',
  styleUrls: ['ajustes.page.scss'],
  imports: [RouterLink, IonContent, IonIcon, DropdownComponent, DatosComponent, AvisosComponent],
})
export class AjustesPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly modals = inject(ModalController);
  private readonly monthState = inject(MonthState);
  protected readonly currencyState = inject(CurrencyState);

  protected readonly currencies: { code: Currency; label: string }[] = [
    { code: 'DOP', label: 'Peso dominicano (RD$)' },
    { code: 'USD', label: 'Dólar estadounidense (US$)' },
  ];

  private readonly categories = signal<Category[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly liveMessage = signal('');
  private modalOpen = false;
  protected readonly currencyOpen = signal(false);
  protected readonly currencyLabel = computed(
    () => this.currencies.find((c) => c.code === this.currencyState.currency())?.label ?? '',
  );

  protected readonly groups = computed<Group[]>(() => {
    const all = this.categories() ?? [];
    return GROUPS.map((g) => ({
      ...g,
      items: all.filter((c) => c.type === g.type).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }));
  });

  constructor() {
    addIcons({ checkmark, chevronBack, chevronDown, chevronForward });
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected async setCurrency(code: Currency) {
    this.currencyOpen.set(false);
    if (code === this.currencyState.currency()) return;
    try {
      await this.currencyState.change(code);
      this.liveMessage.set(`Moneda cambiada a ${code}`);
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudo cambiar la moneda. Inténtalo de nuevo.');
    }
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
