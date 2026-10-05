import { afterRenderEffect, Component, ElementRef, input, viewChild } from '@angular/core';
import { renderReel } from './reel';

/** Monto con el contador giratorio de design.md 10.5. Solo anima cuando el texto cambia. */
@Component({
  selector: 'app-balance-reel',
  template: `
    <div #reel class="t-reel" aria-hidden="true"></div>
    <span class="sr-only" aria-live="polite">{{ text() }}</span>
  `,
})
export class BalanceReelComponent {
  readonly text = input.required<string>();

  private readonly reel = viewChild.required<ElementRef<HTMLElement>>('reel');
  /** Último texto mostrado: es el punto de partida del siguiente giro. */
  private shown = '';

  constructor() {
    afterRenderEffect(() => {
      const text = this.text();
      if (text === this.shown) return;
      renderReel(this.reel().nativeElement, text, this.shown);
      this.shown = text;
    });
  }
}
