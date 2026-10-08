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
import { add, flagOutline, homeOutline, listOutline, repeatOutline, walletOutline } from 'ionicons/icons';
import { filter } from 'rxjs';
import { SavingsFormService } from '../ahorro/savings-form.service';
import { RecurringFormService } from '../fijos/recurring-form.service';
import { TransactionFormService } from '../movimientos/transaction-form.service';
import { DineroFormService } from '../dinero/dinero-form.service';
import { DineroSection, DineroState } from '../dinero/dinero-state';
import { DeudaModalComponent } from '../deudas/deuda.modal';
import { PlanesSection, PlanesState } from '../planes/planes.page';

const DINERO_ADD_LABEL: Record<DineroSection, string> = {
  cuentas: 'Agregar cuenta',
  tarjetas: 'Agregar tarjeta de crédito',
};

const PLANES_ADD_LABEL: Record<PlanesSection, string> = {
  metas: 'Agregar meta de ahorro',
  deudas: 'Agregar deuda o préstamo',
};

interface Tab {
  path: string;
  /** Nombre corto bajo el ícono; `name` es el completo, para lectores de pantalla. */
  label: string;
  name: string;
  icon: string;
  /** Qué agrega el botón + cuando esta pestaña está activa. */
  addLabel: string;
}

const TABS: Tab[] = [
  { path: 'inicio', label: 'Inicio', name: 'Inicio', icon: 'home-outline', addLabel: 'Agregar movimiento' },
  { path: 'movimientos', label: 'Movim.', name: 'Movimientos', icon: 'list-outline', addLabel: 'Agregar movimiento' },
  { path: 'fijos', label: 'Fijos', name: 'Fijos', icon: 'repeat-outline', addLabel: 'Agregar fijo (gasto o ingreso)' },
  { path: 'dinero', label: 'Dinero', name: 'Dinero', icon: 'wallet-outline', addLabel: '' },
  { path: 'planes', label: 'Planes', name: 'Planes: metas y deudas', icon: 'flag-outline', addLabel: '' },
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
  private readonly dineroForm = inject(DineroFormService);
  private readonly dinero = inject(DineroState);
  private readonly planes = inject(PlanesState);

  protected readonly tabs = TABS;
  protected readonly active = signal(this.indexOf(this.router.url));

  private readonly pill = viewChild.required<ElementRef<HTMLElement>>('pill');
  private readonly buttons = viewChildren<ElementRef<HTMLElement>>('tab');
  private ready = false;

  constructor() {
    addIcons({ add, flagOutline, homeOutline, listOutline, repeatOutline, walletOutline });

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
    const tab = TABS[this.active()];
    if (tab.path === 'dinero') return DINERO_ADD_LABEL[this.dinero.section()];
    if (tab.path === 'planes') return PLANES_ADD_LABEL[this.planes.section()];
    return tab.addLabel;
  }

  protected add() {
    const path = TABS[this.active()].path;
    if (path === 'fijos') this.recurringForm.open();
    else if (path === 'dinero') this.addInDinero();
    else if (path === 'planes') this.addInPlanes();
    else this.transactionForm.open();
  }

  /** En Dinero, el + agrega lo de la sección visible. */
  private addInDinero() {
    return this.dinero.section() === 'tarjetas'
      ? this.dineroForm.openAccount(undefined, 'tarjeta')
      : this.dineroForm.openAccount();
  }

  /** En Planes, una meta o una deuda según la sección visible. */
  private addInPlanes() {
    return this.planes.section() === 'metas'
      ? this.savingsForm.openGoal()
      : this.dineroForm.open(DeudaModalComponent, {});
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
