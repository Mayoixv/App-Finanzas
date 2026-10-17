import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, close, shareSocialOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { MonthKey } from '../../domain/month';
import { RecapFact } from '../../domain/month-recap';
import { shareImage } from '../file-io';
import { monthLabel, todayIso } from '../format';
import { t } from '../i18n';
import { LogoComponent } from '../brand/logo.component';
import { recapImage, recapText, RecapText } from './recap-text';

/** "Tu mes en 30 segundos": tarjetas a pantalla completa, una por dato, y al final compartir la imagen. */
@Component({
  selector: 'app-recap',
  template: `
    <div class="recap">
      <div class="top">
        <div class="bars" aria-hidden="true">
          @for (c of cards(); track $index) {
            <span [class.on]="$index <= index()"></span>
          }
        </div>
        <button type="button" class="icon" [attr.aria-label]="t('common.close')" (click)="dismiss()">
          <ion-icon name="close" aria-hidden="true"></ion-icon>
        </button>
      </div>

      @if (cards().length === 0) {
        <p class="sub">{{ t('fields.loading') }}</p>
      }
      @for (card of current(); track index()) {
        <section class="card" aria-live="polite" (click)="next()">
          @if (index() === 0) {
            <app-logo [size]="72"></app-logo>
          }
          <p class="eyebrow">{{ t('recap.cardOf', { n: index() + 1, total: cards().length }) }}</p>
          <h2 class="title">{{ card.title }}</h2>
          <p class="sub">{{ card.sub }}</p>
        </section>
      }

      <div class="actions">
        @if (last()) {
          <button type="button" class="btn-light" [disabled]="sharing()" (click)="share()">
            <ion-icon name="share-social-outline" aria-hidden="true"></ion-icon>
            {{ t('recap.share') }}
          </button>
          <button type="button" class="btn-ghost" (click)="dismiss()">{{ t('recap.done') }}</button>
        } @else {
          <button type="button" class="icon" [disabled]="index() === 0" [attr.aria-label]="t('recap.prev')" (click)="prev()">
            <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
          </button>
          <button type="button" class="btn-light" (click)="next()">
            {{ t('recap.next') }}
            <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
          </button>
        }
      </div>
      @if (error()) {
        <p class="sub" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    .recap {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: calc(var(--ion-safe-area-top, 0px) + 16px) 24px calc(var(--ion-safe-area-bottom, 0px) + 24px);
      background: var(--brand-gradient);
      color: #fff;
    }
    .top {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bars {
      flex: 1;
      display: flex;
      gap: 6px;
    }
    .bars span {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.3);
      transition: background 0.3s;
    }
    .bars span.on {
      background: #fff;
    }
    .card {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 16px;
      animation: recap-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
      cursor: pointer;
    }
    @keyframes recap-in {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.98);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .card {
        animation: none;
      }
    }
    .eyebrow {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
    }
    .title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 48px;
      font-weight: 400;
      line-height: 1;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }
    .sub {
      margin: 0;
      font-size: 18px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.92);
    }
    .actions {
      display: flex;
      gap: 12px;
    }
    .actions button {
      min-height: 52px;
      font: inherit;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-light,
    .btn-ghost {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: var(--radius-pill);
    }
    .btn-light {
      border: 0;
      background: #fff;
      color: var(--violet-700);
    }
    .btn-ghost {
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      background: transparent;
      color: #fff;
    }
    .icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      min-height: 48px;
      border: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
      font-size: 22px;
      cursor: pointer;
    }
    .actions .icon {
      width: 52px;
      height: 52px;
    }
    button:disabled {
      opacity: 0.4;
    }
    button:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 2px;
    }
  `,
  imports: [IonIcon, LogoComponent],
})
export class RecapComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  protected readonly t = t;

  @Input({ required: true }) month!: MonthKey;

  private readonly facts = signal<RecapFact[]>([]);
  protected readonly cards = signal<RecapText[]>([]);
  protected readonly index = signal(0);
  protected readonly current = computed(() => this.cards().slice(this.index(), this.index() + 1));
  protected readonly last = computed(() => this.cards().length > 0 && this.index() === this.cards().length - 1);
  protected readonly sharing = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    addIcons({ chevronBack, chevronForward, close, shareSocialOutline });
  }

  async ngOnInit() {
    const facts = await this.container.getMonthRecap.execute(this.month, todayIso());
    const month = monthLabel(this.month);
    this.facts.set(facts);
    this.cards.set([
      { title: month, sub: t('recap.title') },
      ...facts.map((f) => recapText(f, this.month)),
      { title: t('recap.endTitle', { month: monthLabel(this.month, false) }), sub: t('recap.endSub') },
    ]);
  }

  protected next() {
    if (!this.last()) this.index.update((i) => i + 1);
  }

  protected prev() {
    this.index.update((i) => Math.max(0, i - 1));
  }

  protected async share() {
    this.sharing.set(true);
    this.error.set(null);
    try {
      const image = await recapImage(this.month, this.facts());
      await shareImage(`kuarto-${this.month}.png`, image, t('recap.title'));
    } catch (error) {
      // Cerrar el menú de compartir sin elegir nada también llega aquí: no es un error para el usuario.
      if (!String(error).toLowerCase().includes('cancel')) {
        console.error(error);
        this.error.set(t('recap.shareFailed'));
      }
    } finally {
      this.sharing.set(false);
    }
  }

  protected dismiss() {
    return this.modalCtrl.dismiss();
  }
}
