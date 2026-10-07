import { computed, Injectable, signal } from '@angular/core';

export interface TourStep {
  /** Pantalla donde está el elemento. */
  route: string;
  /** Selectores del elemento real que se resalta; se usa el primero visible. */
  target: string;
  title: string;
  /** Una o dos frases cortas, con el verbo al inicio. */
  text: string;
  /** Paso de acción: la persona toca el elemento real y el recorrido sigue solo al cerrar el formulario. */
  action?: boolean;
}

/** Recorrido por las pantallas reales. Lo que se crea en él es dato real del usuario. */
export const TOUR_STEPS: TourStep[] = [
  {
    route: '/tabs/inicio',
    target: 'app-inicio .hero, app-inicio .empty',
    title: 'Tu mes en un vistazo',
    text: 'Mira tu balance: lo que entró menos lo que gastaste y ahorraste.',
  },
  {
    route: '/tabs/inicio',
    target: 'app-inicio app-month-switcher',
    title: 'Cambia de mes',
    text: 'Toca las flechas o el nombre del mes. Cada mes muestra solo sus movimientos.',
  },
  {
    route: '/tabs/inicio',
    target: 'app-tabs .add-button',
    title: 'Anota un gasto',
    text: 'Toca + para anotar un gasto o un ingreso. Toma unos segundos.',
  },
  {
    route: '/tabs/fijos',
    target: 'app-fijos .empty-action, app-tabs .add-button',
    title: 'Agrega tu primer pago fijo',
    text: 'Tócalo y anota tu alquiler, la luz o tu sueldo. Se repite cada mes.',
    action: true,
  },
  {
    route: '/tabs/dinero',
    target: 'app-dinero .hero',
    title: 'Tu dinero',
    text: 'Revisa tus cuentas, tarjetas, metas de ahorro y deudas en un solo lugar.',
  },
  {
    route: '/reportes',
    target: 'app-reportes .screen-head',
    title: 'Reportes',
    text: 'Compara tus meses y mira en qué se va el gasto. Llegas desde Inicio.',
  },
];

@Injectable({ providedIn: 'root' })
export class TourService {
  readonly steps = TOUR_STEPS;
  readonly active = signal(false);
  readonly index = signal(0);
  readonly step = computed(() => this.steps[this.index()]);
  readonly isLast = computed(() => this.index() === this.steps.length - 1);

  start() {
    this.index.set(0);
    this.active.set(true);
  }

  next() {
    if (this.isLast()) this.active.set(false);
    else this.index.update((i) => i + 1);
  }

  back() {
    this.index.update((i) => Math.max(0, i - 1));
  }

  stop() {
    this.active.set(false);
  }
}
