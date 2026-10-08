import { computed, Injectable, signal } from '@angular/core';
import { HELP } from '../help/help.content';

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

/** Recorrido por las pantallas reales, con los textos de la ayuda (help.content.ts). Lo que se crea en él es dato real del usuario. */
export const TOUR_STEPS: TourStep[] = [
  {
    route: '/tabs/inicio',
    target: 'app-inicio .hero, app-inicio .empty',
    title: 'Tu mes en un vistazo',
    text: HELP.inicio.points[0],
  },
  {
    route: '/tabs/inicio',
    target: 'app-inicio app-month-switcher',
    title: 'Cambia de mes',
    text: HELP.inicio.points[1],
  },
  {
    route: '/tabs/inicio',
    target: 'app-tabs .add-button',
    title: 'Anota un gasto',
    text: HELP.inicio.points[2],
  },
  {
    route: '/tabs/fijos',
    target: 'app-fijos .empty-action, app-tabs .add-button',
    title: 'Agrega tu primer pago fijo',
    text: HELP.fijos.points[0],
    action: true,
  },
  {
    route: '/tabs/dinero',
    target: 'app-dinero .hero',
    title: 'Tu dinero',
    text: HELP.cuentas.points[0],
  },
  {
    route: '/tabs/planes',
    target: 'app-planes .sections',
    title: 'Metas y deudas',
    text: HELP.metas.points[0],
  },
  {
    route: '/reportes',
    target: 'app-reportes .screen-head',
    title: 'Reportes',
    text: HELP.reportes.points[0],
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
