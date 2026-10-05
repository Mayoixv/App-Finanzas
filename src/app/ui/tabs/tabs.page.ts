import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { IonIcon, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';
import { filter } from 'rxjs';
import { SavingsFormService } from '../ahorro/savings-form.service';
import { RecurringFormService } from '../fijos/recurring-form.service';
import { TransactionFormService } from '../movimientos/transaction-form.service';

interface Tab {
  path: string;
  label: string;
  /** Qué agrega el botón + cuando esta pestaña está activa. */
  addLabel: string;
}

const TABS: Tab[] = [
  { path: 'inicio', label: 'Inicio', addLabel: 'Agregar movimiento' },
  { path: 'movimientos', label: 'Movimientos', addLabel: 'Agregar movimiento' },
  { path: 'fijos', label: 'Fijos', addLabel: 'Agregar fijo (gasto o ingreso)' },
  { path: 'ahorro', label: 'Ahorro', addLabel: 'Agregar meta de ahorro' },
];

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonRouterOutlet, IonIcon],
})
export class TabsPage {
  private readonly router = inject(Router);
  private readonly transactionForm = inject(TransactionFormService);
  private readonly recurringForm = inject(RecurringFormService);
  private readonly savingsForm = inject(SavingsFormService);

  protected readonly tabs = TABS;
  protected readonly active = signal(this.indexOf(this.router.url));

  private readonly pill = viewChild.required<ElementRef<HTMLElement>>('pill');
  private readonly buttons = viewChildren<ElementRef<HTMLElement>>('tab');
  private ready = false;

  constructor() {
    addIcons({ add });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.active.set(this.indexOf(e.urlAfterRedirects)));

    afterNextRender(() => {
      this.movePill(false);
      this.ready = true;
    });

    effect(() => {
      this.active();
      if (this.ready) this.movePill(true);
    });
  }

  protected addLabel(): string {
    return TABS[this.active()].addLabel;
  }

  protected add() {
    const path = TABS[this.active()].path;
    if (path === 'fijos') this.recurringForm.open();
    else if (path === 'ahorro') this.savingsForm.openGoal();
    else this.transactionForm.open();
  }

  protected go(tab: Tab) {
    this.router.navigateByUrl(`/tabs/${tab.path}`);
  }

  @HostListener('window:resize')
  protected onResize() {
    if (this.ready) this.movePill(false);
  }

  private indexOf(url: string): number {
    const i = TABS.findIndex((t) => url.includes(`/tabs/${t.path}`));
    return i === -1 ? 0 : i;
  }

  /** Desliza la píldora bajo la pestaña activa; sin transición en el primer render y al redimensionar. */
  private movePill(animated: boolean) {
    const button = this.buttons()[this.active()]?.nativeElement;
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
