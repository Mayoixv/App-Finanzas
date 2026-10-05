import { computed, Injectable, signal } from '@angular/core';
import { currentMonth, monthLabel, shiftMonth } from './format';

/** Mes que están mirando todas las pestañas, y aviso de que los datos cambiaron. */
@Injectable({ providedIn: 'root' })
export class MonthState {
  readonly month = signal(currentMonth());
  readonly label = computed(() => monthLabel(this.month()));
  /** Sube cada vez que se guarda algo; las pestañas lo leen para volver a cargar. */
  readonly version = signal(0);

  set(month: string) {
    this.month.set(month);
  }

  previous() {
    this.month.update((m) => shiftMonth(m, -1));
  }

  next() {
    this.month.update((m) => shiftMonth(m, 1));
  }

  notifyChange() {
    this.version.update((v) => v + 1);
  }
}
