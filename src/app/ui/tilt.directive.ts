import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Inclinación máxima en grados (design.md 10.6). */
const MAX_DEG = 8;

/**
 * Inclinación 3D con reflejo de luz (design.md 10.6). Va en el contenedor exterior `.t-tilt`, que contiene una
 * `.t-tilt-card` y, dentro, un `.t-tilt-glare`. Funciona igual con dedo, mouse y lápiz.
 */
@Directive({ selector: '[appTilt]' })
export class TiltDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  private card(): HTMLElement | null {
    return this.host.querySelector('.t-tilt-card');
  }

  @HostListener('pointerenter')
  protected onEnter() {
    if (this.reduce) return;
    this.host.classList.add('is-hover');
  }

  @HostListener('pointermove', ['$event'])
  protected onMove(e: PointerEvent) {
    if (this.reduce) return;
    const r = this.host.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    this.host.classList.add('is-hover');
    this.card()?.classList.add('is-tilting');
    this.host.style.setProperty('--tilt-ry', `${(x - 0.5) * 2 * MAX_DEG}deg`);
    this.host.style.setProperty('--tilt-rx', `${-(y - 0.5) * 2 * MAX_DEG}deg`);
    this.host.style.setProperty('--tilt-gx', `${x * 100}%`);
    this.host.style.setProperty('--tilt-gy', `${y * 100}%`);
  }

  /** Al soltar o si el navegador empieza a desplazar la pantalla, la tarjeta vuelve a plana (transición lenta). */
  @HostListener('pointerleave')
  @HostListener('pointercancel')
  @HostListener('pointerup')
  protected reset() {
    this.host.classList.remove('is-hover');
    this.card()?.classList.remove('is-tilting');
    ['--tilt-rx', '--tilt-ry', '--tilt-gx', '--tilt-gy'].forEach((p) => this.host.style.removeProperty(p));
  }
}
