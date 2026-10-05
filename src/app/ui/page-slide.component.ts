import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Cambio de vista lado a lado de design.md 10.3, para exactamente dos vistas.
 * Contenido: <div page1>…</div> y <div page2>…</div>. Como las páginas van en position: absolute,
 * el contenedor toma la altura de la página visible (medida con ResizeObserver) para no colapsar a 0 px.
 */
@Component({
  selector: 'app-page-slide',
  template: `
    <div class="t-page-slide" [attr.data-page]="page()" [style.height.px]="height()">
      <section #p1 class="t-page" data-page-id="1" [attr.inert]="page() === 1 ? null : ''">
        <ng-content select="[page1]" />
      </section>
      <section #p2 class="t-page" data-page-id="2" [attr.inert]="page() === 2 ? null : ''">
        <ng-content select="[page2]" />
      </section>
    </div>
  `,
  styleUrls: ['page-slide.component.scss'],
})
export class PageSlideComponent {
  readonly page = input<1 | 2>(1);

  protected readonly height = signal<number | null>(null);
  private readonly p1 = viewChild.required<ElementRef<HTMLElement>>('p1');
  private readonly p2 = viewChild.required<ElementRef<HTMLElement>>('p2');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.p1().nativeElement);
      observer.observe(this.p2().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
      this.measure();
    });
    effect(() => {
      this.page();
      this.measure();
    });
  }

  private measure() {
    const active = this.page() === 1 ? this.p1() : this.p2();
    if (active) this.height.set(active.nativeElement.offsetHeight);
  }
}
