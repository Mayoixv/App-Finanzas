import { computed, inject, Injectable, signal } from '@angular/core';
import { APP_CONTAINER } from '../../app.container';
import { OnboardingGoal } from '../../application/use-cases/user-profile';

export type TourStepId = 'inicio' | 'movimientos' | 'fijos' | 'dinero' | 'metas' | 'deudas' | 'resumen' | 'respaldo';

export interface TourStep {
  id: TourStepId;
  /** Pantalla donde está el elemento (con su `?ver=` si hace falta). */
  route: string;
  /** Selectores del elemento real que se resalta, en orden de preferencia; se usa el primero visible. */
  target: string;
}

/**
 * Recorrido por las pantallas reales. Título, explicación y ejemplo de cada paso están en es.json (tour.steps.*);
 * el ejemplo se dibuja en la tarjeta con datos de muestra que no se guardan.
 */
const STEPS: Record<TourStepId, TourStep> = {
  inicio: { id: 'inicio', route: '/tabs/inicio', target: 'app-inicio .hero, app-inicio .empty' },
  movimientos: { id: 'movimientos', route: '/tabs/movimientos', target: 'app-tabs .add-button' },
  fijos: { id: 'fijos', route: '/tabs/fijos', target: 'app-fijos .summary, app-fijos .empty' },
  dinero: { id: 'dinero', route: '/tabs/dinero', target: 'app-dinero .hero, app-cuentas-view' },
  metas: { id: 'metas', route: '/tabs/planes?ver=metas', target: 'app-metas-view .hero, app-planes .sections' },
  deudas: { id: 'deudas', route: '/tabs/planes?ver=deudas', target: 'app-deudas-view .totals, app-deudas-view .empty, app-planes .sections' },
  resumen: { id: 'resumen', route: '/reportes', target: 'app-reportes .stat, app-reportes .card, app-reportes .screen-head' },
  respaldo: { id: 'respaldo', route: '/ajustes/datos', target: 'app-datos .rows' },
};

const DEFAULT_ORDER: TourStepId[] = ['inicio', 'movimientos', 'fijos', 'dinero', 'metas', 'deudas', 'resumen', 'respaldo'];
/** La sección del objetivo elegido va justo después de Inicio. */
const FIRST_FOR_GOAL: Record<OnboardingGoal, TourStepId> = {
  controlar: 'movimientos',
  organizar: 'fijos',
  ahorrar: 'metas',
  deudas: 'deudas',
};

export function tourOrder(goal: OnboardingGoal | null): TourStep[] {
  const first = goal ? FIRST_FOR_GOAL[goal] : null;
  const order = first ? ['inicio', first, ...DEFAULT_ORDER.filter((id) => id !== 'inicio' && id !== first)] : DEFAULT_ORDER;
  return (order as TourStepId[]).map((id) => STEPS[id]);
}

@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly container = inject(APP_CONTAINER);
  readonly steps = signal<TourStep[]>(tourOrder(null));
  readonly active = signal(false);
  readonly index = signal(0);
  readonly step = computed(() => this.steps()[this.index()]);
  readonly isLast = computed(() => this.index() === this.steps().length - 1);

  async start() {
    this.steps.set(tourOrder(await this.container.profile.goal().catch(() => null)));
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
