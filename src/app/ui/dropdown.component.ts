import {
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';

/** Igual que --dropdown-close-dur: lo que dura la animación de cierre antes de ocultarse del todo. */
const CLOSE_MS = 150;

export type DropdownOrigin =
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Menú desplegable de design.md 10.4. Va dentro de un contenedor con position: relative que también
 * contiene el botón que lo abre (con aria-haspopup="menu"); el padre lo coloca con CSS.
 * Se cierra al tocar fuera, con Escape y con el botón atrás de Android.
 */
@Component({
  selector: 'app-dropdown',
  template: `
    <div
      #panel
      class="t-dropdown"
      role="menu"
      [attr.data-origin]="origin()"
      [attr.aria-label]="label()"
      [class.is-open]="open()"
      [class.is-closing]="closing()"
      (keydown)="onKeydown($event)"
    >
      <ng-content />
    </div>
  `,
  styleUrls: ['dropdown.component.scss'],
})
export class DropdownComponent {
  readonly open = model(false);
  readonly origin = input<DropdownOrigin>('top-left');
  readonly label = input('');

  protected readonly closing = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private wasOpen = false;
  private closeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen && !this.wasOpen) {
        clearTimeout(this.closeTimer);
        this.closing.set(false);
        // Al abrir, el foco entra al menú (la opción marcada si hay una) para poder usarlo con teclado.
        setTimeout(() => {
          const items = this.items();
          (items.find((i) => i.getAttribute('aria-checked') === 'true') ?? items[0])?.focus();
        });
      }
      if (!isOpen && this.wasOpen) {
        this.closing.set(true);
        this.closeTimer = setTimeout(() => this.closing.set(false), CLOSE_MS);
      }
      this.wasOpen = isOpen;
    });
  }

  close(returnFocus = true) {
    if (!this.open()) return;
    this.open.set(false);
    if (returnFocus) this.trigger()?.focus();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent) {
    const anchor = this.host.nativeElement.parentElement;
    if (this.open() && anchor && !event.composedPath().includes(anchor)) this.close(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.close();
  }

  @HostListener('document:ionBackButton', ['$event'])
  protected onBackButton(event: Event) {
    if (!this.open()) return;
    (event as CustomEvent<{ register: (priority: number, handler: () => void) => void }>).detail.register(
      100,
      () => this.close(),
    );
  }

  protected onKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = this.items();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + step + items.length) % items.length]?.focus();
  }

  private items(): HTMLElement[] {
    return [...this.panel().nativeElement.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
  }

  private trigger(): HTMLElement | null {
    return this.host.nativeElement.parentElement?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ?? null;
  }
}
