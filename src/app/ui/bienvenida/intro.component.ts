import { Component, HostListener, OnDestroy, OnInit, output, signal } from '@angular/core';
import { LogoComponent } from '../brand/logo.component';
import { t } from '../i18n';
import { APP_NAME } from '../../version';

/** Lo que dura la entrada completa antes de pasar a las preguntas (las animaciones terminan a los ~3 s). */
const DURATION_MS = 3400;
/** Con "reducir movimiento" no hay animación: se ve todo quieto un momento. */
const STILL_MS = 1800;
const FADE_OUT_MS = 350;

/**
 * Entrada animada de la primera vez (como un video corto): fondo de la marca, el logo se "enciende", el nombre
 * sube letra a letra y luego aparece el eslogan. Solo anima transform y opacity. Tocar la pantalla la salta.
 */
@Component({
  selector: 'app-intro',
  template: `
    <div class="intro" [class.leaving]="leaving()" role="img" [attr.aria-label]="name + '. ' + t('intro.slogan')">
      <div class="glow" aria-hidden="true"></div>
      <div class="logo-wrap" aria-hidden="true">
        <span class="halo"></span>
        <app-logo [size]="132"></app-logo>
      </div>
      <h1 class="name" aria-hidden="true">
        @for (letter of letters; track $index) {
          <span class="letter" [style.--i]="$index">{{ letter }}</span>
        }
      </h1>
      <p class="slogan" aria-hidden="true">{{ t('intro.slogan') }}</p>
      <p class="skip" aria-hidden="true">{{ t('intro.skip') }}</p>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: block;
    }
    .intro {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 22px;
      padding: 32px;
      background: radial-gradient(120% 80% at 50% 30%, var(--violet-900) 0%, var(--ink-950) 70%);
      color: #fff;
      text-align: center;
      overflow: hidden;
      animation: t-intro-bg 0.45s ease-out both;
      transition: opacity ${FADE_OUT_MS}ms ease;
    }
    .intro.leaving {
      opacity: 0;
    }
    /* Brillo de la marca detrás del logo, que entra suave. */
    .glow {
      position: absolute;
      top: 18%;
      left: 50%;
      width: 520px;
      height: 520px;
      margin-left: -260px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(var(--violet-400-rgb), 0.55), transparent 62%);
      opacity: 0;
      animation: t-intro-glow 1.6s 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .logo-wrap {
      position: relative;
      display: grid;
      place-items: center;
      opacity: 0;
      transform: scale(0.6);
      animation: t-intro-logo 0.8s 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .logo-wrap app-logo {
      box-shadow: 0 24px 60px -18px rgba(var(--violet-600-rgb), 0.9);
    }
    /* Destello: un aro de luz que crece y se apaga, como si el logo se encendiera. */
    .halo {
      position: absolute;
      inset: -14px;
      border-radius: 32%;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85), 0 0 36px 6px rgba(var(--violet-400-rgb), 0.9);
      opacity: 0;
      transform: scale(0.9);
      animation: t-intro-halo 0.9s 0.85s ease-out forwards;
    }
    .name {
      display: flex;
      margin: 6px 0 0;
      font-family: var(--font-display);
      font-size: 64px;
      font-weight: 400;
      line-height: 1;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      overflow: hidden;
    }
    .letter {
      display: inline-block;
      opacity: 0;
      transform: translateY(100%);
      animation: t-intro-letter 0.5s calc(1.05s + var(--i) * 0.07s) cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .slogan {
      max-width: 300px;
      margin: 0;
      font-size: 17px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.86);
      opacity: 0;
      transform: translateY(10px);
      animation: t-intro-slogan 0.9s 1.85s ease-out forwards;
    }
    .skip {
      position: absolute;
      bottom: calc(var(--ion-safe-area-bottom, 0px) + 28px);
      margin: 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      opacity: 0;
      animation: t-intro-slogan 0.6s 0.9s ease-out forwards;
    }
    @keyframes t-intro-bg {
      from {
        opacity: 0;
      }
    }
    @keyframes t-intro-glow {
      to {
        opacity: 1;
      }
    }
    @keyframes t-intro-logo {
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes t-intro-halo {
      40% {
        opacity: 1;
      }
      to {
        opacity: 0;
        transform: scale(1.18);
      }
    }
    @keyframes t-intro-letter {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes t-intro-slogan {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .intro,
      .glow,
      .logo-wrap,
      .halo,
      .letter,
      .slogan,
      .skip {
        animation: none;
        opacity: 1;
        transform: none;
      }
      .halo {
        opacity: 0;
      }
    }
  `,
  imports: [LogoComponent],
})
export class IntroComponent implements OnInit, OnDestroy {
  readonly done = output<void>();
  protected readonly t = t;
  protected readonly name = APP_NAME;
  protected readonly letters = [...APP_NAME];
  protected readonly leaving = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.timer = setTimeout(() => this.finish(), still ? STILL_MS : DURATION_MS);
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
  }

  /** Tocar en cualquier parte salta la entrada. */
  @HostListener('click')
  protected skip() {
    this.finish();
  }

  private finish() {
    if (this.leaving()) return;
    clearTimeout(this.timer);
    this.leaving.set(true);
    setTimeout(() => this.done.emit(), FADE_OUT_MS);
  }
}
