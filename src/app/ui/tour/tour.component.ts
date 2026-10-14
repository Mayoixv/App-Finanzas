import { Component, computed, effect, ElementRef, HostListener, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { formatMoney } from '../format';
import { t, tList } from '../i18n';
import { TourService, TourStep } from './tour.service';
import { CloudBackupService } from '../cloud/cloud-backup.service';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, phonePortraitOutline } from 'ionicons/icons';

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

/** Montos de muestra de los ejemplos (en centavos): solo se dibujan en la tarjeta, nunca se guardan. */
const DEMO = {
  income: 3_000_000,
  spent: 1_200_000,
  gas: 35_000,
  rent: 1_500_000,
  cash: 250_000,
  card: 800_000,
  goal: 2_000_000,
  goalSaved: 800_000,
  debt: 60_000_000,
  debtLeft: 45_000_000,
};

/**
 * Recorrido guiado: oscurece la pantalla, deja a la vista el elemento real y muestra una tarjeta con una
 * explicación corta y un ejemplo con datos de muestra. Mientras está activo, la app de detrás no responde (inert):
 * ni toques, ni desplazamiento, ni la barra de pestañas; el recorrido mueve la pantalla por su cuenta.
 */
@Component({
  selector: 'app-tour',
  template: `
    @if (tour.active()) {
      <div class="catcher" aria-hidden="true"></div>
      <div
        class="hole"
        [class.ready]="box()"
        [style.left.px]="box()?.x"
        [style.top.px]="box()?.y"
        [style.width.px]="box()?.w"
        [style.height.px]="box()?.h"
        aria-hidden="true"
      ></div>
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
            <p class="progress">{{ t('tour.progress', { n: tour.index() + 1, total: tour.steps().length }) }}</p>
            <h2 class="title" id="tour-title">{{ t('tour.steps.' + step.id + '.title') }}</h2>
            <p class="text" id="tour-text">{{ t('tour.steps.' + step.id + '.text', amounts) }}</p>
            <div class="demo" [attr.aria-label]="t('tour.example')">
              @switch (step.id) {
                @case ('inicio') {
                  <div class="demo-hero">
                    <span class="demo-small">{{ t('tour.demo.left') }}</span>
                    <span class="demo-big">{{ amounts.left }}</span>
                    <span class="demo-small">{{ t('tour.demo.inOut', amounts) }}</span>
                  </div>
                }
                @case ('movimientos') {
                  <div class="demo-row">
                    <span class="demo-dot" style="background: #2563eb" aria-hidden="true"></span>
                    <span class="demo-text"><b>{{ t('tour.demo.gas') }}</b><small>{{ t('tour.demo.fromCash') }}</small></span>
                    <span class="demo-amount">−{{ amounts.gas }}</span>
                  </div>
                }
                @case ('fijos') {
                  <div class="demo-row">
                    <span class="demo-dot" style="background: #6639ec" aria-hidden="true"></span>
                    <span class="demo-text"><b>{{ t('tour.demo.rent') }}</b><small>{{ t('tour.demo.due5') }}</small></span>
                    <span class="demo-chip">{{ t('status.pending') }}</span>
                  </div>
                }
                @case ('dinero') {
                  <div class="demo-row">
                    <span class="demo-text"><b>{{ t('accountType.efectivo') }}</b></span>
                    <span class="demo-amount">{{ amounts.cash }}</span>
                  </div>
                  <div class="demo-row">
                    <span class="demo-text"><b>Visa</b><small>{{ t('accountType.tarjeta') }}</small></span>
                    <span class="demo-amount">{{ t('cuentas.owesAmount', { amount: amounts.card }) }}</span>
                  </div>
                }
                @case ('metas') {
                  <div class="demo-goal">
                    <span class="demo-text"><b>{{ t('tour.demo.trip') }}</b><small>{{ t('tour.demo.goalOf', amounts) }}</small></span>
                    <span class="demo-bar"><span style="width: 40%"></span></span>
                  </div>
                }
                @case ('deudas') {
                  <div class="demo-goal">
                    <span class="demo-text"><b>{{ t('tour.demo.carLoan') }}</b><small>{{ t('tour.demo.debtLeft', amounts) }}</small></span>
                    <span class="demo-bar"><span style="width: 25%"></span></span>
                  </div>
                }
                @case ('resumen') {
                  <div class="demo-hero">
                    <span class="demo-small">{{ t('tour.demo.saved') }}</span>
                    <span class="demo-big">15%</span>
                    <span class="demo-small">{{ t('inicio.rating.regular') }}</span>
                  </div>
                }
                @case ('respaldo') {
                  <div class="demo-row">
                    <ion-icon class="demo-icon" name="phone-portrait-outline" aria-hidden="true"></ion-icon>
                    <span class="demo-text"><b>{{ t('tour.demo.phone') }}</b><small>{{ t('tour.demo.phoneSub') }}</small></span>
                  </div>
                  <div class="demo-row">
                    <ion-icon class="demo-icon" name="cloud-upload-outline" aria-hidden="true"></ion-icon>
                    <span class="demo-text"><b>{{ t('tour.demo.cloud') }}</b><small>{{ t('tour.demo.cloudSub') }}</small></span>
                  </div>
                  <ul class="demo-list">
                    @for (p of tList('tour.backupPoints'); track $index) {
                      <li>{{ p }}</li>
                    }
                  </ul>
                }
              }
            </div>
          </div>
        }
        <footer class="foot">
          @if (!tour.isLast()) {
            <button type="button" class="skip" (click)="skip()">{{ t('tour.skip') }}</button>
          }
          <span class="nav">
            @if (tour.index() > 0) {
              <button type="button" class="btn-secondary back" (click)="tour.back()">{{ t('onboarding.change') }}</button>
            }
            @if (tour.isLast()) {
              <button type="button" class="btn-primary next" (click)="finish('activar')">{{ t('tour.activateBackup') }}</button>
            } @else {
              <button type="button" class="btn-primary next" (click)="tour.next()">{{ t('tour.next') }}</button>
            }
          </span>
          @if (tour.isLast()) {
            @if (cloud.available) {
              <button type="button" class="btn-secondary cloud" (click)="finish('nube')">{{ t('tour.saveCloud') }}</button>
            }
            <button type="button" class="later" (click)="finish(null)">{{ t('onboarding.notNow') }}</button>
          }
        </footer>
      </section>
    }
  `,
  styleUrls: ['tour.component.scss'],
  imports: [IonIcon],
})
export class TourComponent {
  protected readonly tour = inject(TourService);
  protected readonly cloud = inject(CloudBackupService);
  private readonly router = inject(Router);
  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  protected readonly t = t;
  protected readonly tList = tList;

  protected readonly box = signal<Box | null>(null);
  private target: HTMLElement | null = null;
  private seq = 0;

  /** Montos de los ejemplos ya con el símbolo de la moneda elegida. */
  protected get amounts() {
    return {
      income: formatMoney(DEMO.income),
      spent: formatMoney(DEMO.spent),
      left: formatMoney(DEMO.income - DEMO.spent),
      gas: formatMoney(DEMO.gas),
      rent: formatMoney(DEMO.rent),
      cash: formatMoney(DEMO.cash),
      card: formatMoney(DEMO.card),
      goal: formatMoney(DEMO.goal),
      goalSaved: formatMoney(DEMO.goalSaved),
      debt: formatMoney(DEMO.debt),
      debtLeft: formatMoney(DEMO.debtLeft),
    };
  }

  /** Con el elemento abajo, la tarjeta va arriba, y al revés. */
  protected readonly cardOnTop = computed(() => {
    const b = this.box();
    return !!b && b.y + b.h / 2 > window.innerHeight / 2;
  });

  constructor() {
    addIcons({ cloudUploadOutline, phonePortraitOutline });
    effect(() => {
      // Detrás del recorrido la app no responde a toques, desplazamiento ni teclado (ni la barra de pestañas).
      document.querySelector('ion-router-outlet')?.toggleAttribute('inert', this.tour.active());
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
    this.target = null;
  }

  private async show(step: TourStep) {
    const seq = ++this.seq;
    if (this.router.url !== step.route) await this.router.navigateByUrl(step.route);
    const el = await this.waitFor(step.target, seq);
    if (seq !== this.seq) return;
    this.target = el;
    if (!el) {
      // Si el elemento no aparece (pantalla vacía o con error), la tarjeta se muestra igual, sin resaltado.
      this.box.set(null);
    } else {
      // El recorrido mueve la pantalla por su cuenta hasta el elemento (la persona no puede desplazarla).
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await new Promise((r) => setTimeout(r, 350));
      if (seq !== this.seq) return;
      this.measure();
    }
    this.card()?.nativeElement.focus();
  }

  /**
   * Los selectores van en orden de preferencia. Los de respaldo solo se aceptan si el preferido no aparece en un
   * momento (por ejemplo, una pantalla que aún carga).
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

  /** Saltar no pide confirmación: se sale al instante. */
  protected skip() {
    this.tour.stop();
  }

  /** Último paso: va a Datos y respaldo y empieza a activar el respaldo automático o el de la nube; o vuelve a Inicio. */
  protected finish(start: 'activar' | 'nube' | null) {
    this.tour.stop();
    this.router.navigateByUrl(start ? `/ajustes/datos?${start}=1` : '/tabs/inicio');
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    if (this.tour.active()) this.skip();
  }

  /** Atrás de Android: un paso atrás, o salir en el primero. */
  @HostListener('document:ionBackButton', ['$event'])
  protected onBackButton(event: Event) {
    if (!this.tour.active()) return;
    (event as CustomEvent<{ register: (priority: number, handler: () => void) => void }>).detail.register(110, () =>
      this.tour.index() > 0 ? this.tour.back() : this.skip(),
    );
  }
}
