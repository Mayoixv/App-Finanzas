import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  HostListener,
  input,
  model,
  viewChild,
  viewChildren,
} from '@angular/core';

export interface PillOption {
  value: string;
  label: string;
}

/** Control de dos (o más) opciones con la píldora deslizante de design.md 10.1, para usar dentro de una pantalla. */
@Component({
  selector: 'app-pill-toggle',
  template: `
    <div class="t-tabs" role="tablist" [attr.aria-label]="label()">
      <span #pill class="t-tabs-pill" aria-hidden="true"></span>
      @for (o of options(); track o.value) {
        <button
          #opt
          type="button"
          class="t-tab"
          role="tab"
          [attr.aria-selected]="value() === o.value"
          (click)="value.set(o.value)"
        >
          {{ o.label }}
        </button>
      }
    </div>
  `,
  styleUrls: ['pill-toggle.component.scss'],
})
export class PillToggleComponent {
  readonly options = input.required<PillOption[]>();
  readonly value = model.required<string>();
  readonly label = input('');

  private readonly pill = viewChild.required<ElementRef<HTMLElement>>('pill');
  private readonly buttons = viewChildren<ElementRef<HTMLElement>>('opt');
  private ready = false;

  constructor() {
    afterNextRender(() => {
      this.movePill(false);
      this.ready = true;
    });
    effect(() => {
      this.value();
      if (this.ready) this.movePill(true);
    });
  }

  @HostListener('window:resize')
  protected onResize() {
    if (this.ready) this.movePill(false);
  }

  /** Igual que en la barra inferior: sin transición en el primer render y al redimensionar. */
  private movePill(animated: boolean) {
    const index = this.options().findIndex((o) => o.value === this.value());
    const button = this.buttons()[index]?.nativeElement;
    const pill = this.pill().nativeElement;
    if (!button) return;
    if (!animated) pill.style.transition = 'none';
    pill.style.transform = `translateX(${button.offsetLeft}px)`;
    pill.style.width = `${button.offsetWidth}px`;
    if (!animated) {
      void pill.offsetWidth;
      pill.style.transition = '';
    }
  }
}
