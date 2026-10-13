import { Component, computed, inject, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronDown, chevronForward } from 'ionicons/icons';
import { DropdownComponent } from './dropdown.component';
import { currentMonth } from './format';
import { MonthState } from './month-state';
import { t, locale } from './i18n';

const monthNames = () =>
  Array.from({ length: 12 }, (_, i) => {
    const name = new Intl.DateTimeFormat(locale(), { month: 'short' }).format(new Date(2026, i, 1));
    return name.replace('.', '').replace(/^./, (c) => c.toUpperCase());
  });

/** Flechas para el mes anterior y el siguiente; tocar el nombre abre un menú para saltar a cualquier mes (design.md 10.4). */
@Component({
  selector: 'app-month-switcher',
  templateUrl: 'month-switcher.component.html',
  styleUrls: ['month-switcher.component.scss'],
  imports: [IonIcon, DropdownComponent],
})
export class MonthSwitcherComponent {
  protected readonly t = t;
  protected readonly state = inject(MonthState);

  protected readonly open = signal(false);
  /** Año que se ve dentro del menú; puede no ser el del mes elegido hasta que se toque un mes. */
  protected readonly year = signal(Number(this.state.month().slice(0, 4)));
  protected readonly months = computed(() => monthNames().map((name, i) => ({ name, number: String(i + 1).padStart(2, '0') })));
  protected readonly selected = computed(() => this.state.month());
  protected readonly today = currentMonth();

  constructor() {
    addIcons({ chevronBack, chevronDown, chevronForward });
  }

  protected toggle() {
    if (!this.open()) this.year.set(Number(this.state.month().slice(0, 4)));
    this.open.update((v) => !v);
  }

  protected key(number: string): string {
    return `${this.year()}-${number}`;
  }

  protected pick(month: string) {
    this.state.set(month);
    this.open.set(false);
  }
}
