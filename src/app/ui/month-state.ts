import { computed, Injectable, signal } from '@angular/core';
import { currentMonth, monthLabel, shiftMonth } from './format';

/** Mes que están mirando todas las pestañas, y aviso de que los datos cambiaron. */
@Injectable({ providedIn: 'root' })
export class MonthState {
  readonly month = signal(currentMonth());
  readonly label = computed(() => monthLabel(this.month()));
  /** Sube cada vez que se guarda algo; las pestañas lo leen para volver a cargar. */
  readonly version = signal(0);
  /**
   * Verdadero un momento después de guardar o borrar algo: las listas animan las filas que entran o salen.
   * Al cambiar de mes o de filtro las filas se reemplazan sin animación (design.md: no animar cada tarjeta).
   */
  readonly animateLists = signal(false);
  private animateTimer?: ReturnType<typeof setTimeout>;

  set(month: string) {
    this.animateLists.set(false);
    this.month.set(month);
  }

  previous() {
    this.animateLists.set(false);
    this.month.update((m) => shiftMonth(m, -1));
  }

  next() {
    this.animateLists.set(false);
    this.month.update((m) => shiftMonth(m, 1));
  }

  notifyChange() {
    this.animateLists.set(true);
    clearTimeout(this.animateTimer);
    this.animateTimer = setTimeout(() => this.animateLists.set(false), 1500);
    this.version.update((v) => v + 1);
  }
}
