import { Component, computed, effect, ElementRef, HostListener, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TourService, TourStep } from './tour.service';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Margen del resaltado alrededor del elemento. */
const PAD = 8;
/** Cuánto se espera a que aparezca el elemento tras cambiar de pantalla. */
const FIND_TIMEOUT_MS = 4000;
/** Cuánto se espera al elemento preferido antes de usar uno de respaldo. */
const PREFERRED_WAIT_MS = 1500;

/** Primer elemento visible (no en una página de Ionic oculta) que coincida con alguno de los selectores. */
function findVisible(selectors: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selectors)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && !el.closest('.ion-page-hidden')) return el;
  }
  return null;
}

function findFirst(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    const el = findVisible(s);
    if (el) return el;
  }
  return null;
}

/**
 * Recorrido guiado: oscurece la pantalla, deja a la vista el elemento real y muestra una tarjeta corta.
 * En los pasos de acción se puede tocar el elemento; el recorrido sigue solo al cerrarse el formulario que abre.
 * El pie de la tarjeta (progreso y botones) es fijo; el texto va encima con su propio espacio.
 */
@Component({
  selector: 'app-tour',
  template: `
    @if (tour.active()) {
      <div class="catcher" [style.clip-path]="clip()" [class.hidden]="waiting()" aria-hidden="true"></div>
      <div
        class="hole"
        [class.ready]="box()"
        [class.hidden]="waiting()"
        [style.left.px]="box()?.x"
        [style.top.px]="box()?.y"
        [style.width.px]="box()?.w"
        [style.height.px]="box()?.h"
        aria-hidden="true"
      ></div>
      @if (!waiting()) {
        <section
          #card
          class="card"
          [class.top]="cardOnTop()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-text"
          tabindex="-1"
        >
          <!-- Se vuelve a crear en cada paso, para que el texto nuevo entre con su animación. -->
          @for (step of [tour.step()]; track tour.index()) {
            <div class="content">
              <p class="progress">{{ tour.index() + 1 }} de {{ tour.steps.length }}</p>
              <h2 class="title" id="tour-title">{{ step.title }}</h2>
              <p class="text" id="tour-text">{{ step.text }}</p>
            </div>
          }
          <footer class="foot">
            <button type="button" class="skip" (click)="skip()">Saltar</button>
            <span class="nav">
              @if (tour.index() > 0) {
                <button type="button" class="btn-secondary back" (click)="tour.back()">Atrás</button>
              }
              <button type="button" class="btn-primary next" (click)="next()">
                {{ tour.isLast() ? 'Listo' : tour.step().action ? 'Después' : 'Siguiente' }}
              </button>
            </span>
          </footer>
        </section>
      }
    }
  `,
  styleUrls: ['tour.component.scss'],
})
export class TourComponent {
  protected readonly tour = inject(TourService);
  private readonly router = inject(Router);
  private readonly card = viewChild<ElementRef<HTMLElement>>('card');

  protected readonly box = signal<Box | null>(null);
  /** En un paso de acción, mientras está abierto el formulario que abrió la persona. */
  protected readonly waiting = signal(false);
  private target: HTMLElement | null = null;
  private openModals = 0;
  private seq = 0;

  /** Con el elemento arriba, la tarjeta va abajo, y al revés. */
  protected readonly cardOnTop = computed(() => {
    const b = this.box();
    return !!b && b.y + b.h / 2 > window.innerHeight / 2;
  });

  /** La capa que bloquea los toques: completa, o con un hueco sobre el elemento en los pasos de acción. */
  protected readonly clip = computed(() => {
    const b = this.box();
    if (!b || !this.tour.step().action) return 'none';
    const { innerWidth: W, innerHeight: H } = window;
    return `path(evenodd, 'M0 0H${W}V${H}H0Z M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z')`;
  });

  constructor() {
    effect(() => {
      if (!this.tour.active()) {
        this.reset();
        return;
      }
      const step = this.tour.step();
      untracked(() => this.show(step));
    });
  }

  private reset() {
    this.box.set(null);
    this.waiting.set(false);
    this.target = null;
  }

  private async show(step: TourStep) {
    const seq = ++this.seq;
    this.waiting.set(false);
    if (this.router.url.split('?')[0] !== step.route) await this.router.navigateByUrl(step.route);
    const el = await this.waitFor(step.target, seq);
    if (seq !== this.seq) return;
    this.target = el;
    if (!el) {
      // Si el elemento no aparece (pantalla vacía o con error), la tarjeta se muestra igual, sin resaltado.
      this.box.set(null);
    } else {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await new Promise((r) => setTimeout(r, 350));
      if (seq !== this.seq) return;
      this.measure();
    }
    this.card()?.nativeElement.focus();
  }

  /**
   * Los selectores van en orden de preferencia. Los de respaldo (por ejemplo el + de abajo, que ya se ve antes de
   * que cargue la pantalla) solo se aceptan si el preferido no aparece en un momento.
   */
  private async waitFor(selectors: string, seq: number): Promise<HTMLElement | null> {
    const [preferred, ...fallbacks] = selectors.split(',').map((s) => s.trim());
    const start = Date.now();
    while (Date.now() - start < FIND_TIMEOUT_MS && seq === this.seq) {
      const el = findVisible(preferred) ?? (Date.now() - start > PREFERRED_WAIT_MS ? findFirst(fallbacks) : null);
      if (el) return el;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }

  @HostListener('window:resize')
  protected measure() {
    const el = this.target;
    if (!el || !this.tour.active()) return;
    const r = el.getBoundingClientRect();
    this.box.set({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
  }

  protected skip() {
    this.tour.stop();
  }

  protected next() {
    if (!this.tour.isLast()) return this.tour.next();
    this.tour.stop();
    this.router.navigateByUrl('/tabs/inicio');
  }

  /** En un paso de acción, tocar el elemento real deja ver el formulario que abre. */
  @HostListener('document:click', ['$event'])
  protected onClick(event: MouseEvent) {
    if (!this.tour.active() || !this.tour.step().action || !this.target) return;
    if (event.composedPath().includes(this.target)) this.waiting.set(true);
  }

  @HostListener('document:ionModalDidPresent')
  protected onModalPresent() {
    this.openModals++;
  }

  /** El formulario (y las hojas que abra dentro) se cerró: el recorrido sigue. */
  @HostListener('document:ionModalDidDismiss')
  protected onModalDismiss() {
    this.openModals = Math.max(0, this.openModals - 1);
    if (this.waiting() && this.openModals === 0) this.tour.next();
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    if (this.tour.active() && !this.waiting()) this.skip();
  }

  /** Atrás de Android: un paso atrás, o salir en el primero. */
  @HostListener('document:ionBackButton', ['$event'])
  protected onBackButton(event: Event) {
    if (!this.tour.active() || this.waiting()) return;
    (event as CustomEvent<{ register: (priority: number, handler: () => void) => void }>).detail.register(110, () =>
      this.tour.index() > 0 ? this.tour.back() : this.skip(),
    );
  }
}
