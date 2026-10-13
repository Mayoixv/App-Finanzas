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
import { DeudaModalComponent } from '../deudas/deuda.modal';
import { PlanesSection, PlanesState } from '../planes/planes.page';
import { t } from '../i18n';

const PLANES_ADD_LABEL: Record<PlanesSection, string> = {
  metas: 'tabs.addGoal',
  deudas: 'tabs.addDebt',
};

/** Textos en es.json, tabs.<path>: `label` corto bajo el ícono, `name` completo (lectores de pantalla), `add` del botón +. */
interface Tab {
  path: string;
  icon: string;
}

const TABS: Tab[] = [
  { path: 'inicio', icon: 'home-outline' },
  { path: 'movimientos', icon: 'list-outline' },
  { path: 'fijos', icon: 'repeat-outline' },
  { path: 'dinero', icon: 'wallet-outline' },
  { path: 'planes', icon: 'flag-outline' },
];

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonRouterOutlet, IonIcon],
})
export class TabsPage {
  protected readonly t = t;
  private readonly router = inject(Router);
  private readonly transactionForm = inject(TransactionFormService);
  private readonly recurringForm = inject(RecurringFormService);
  private readonly savingsForm = inject(SavingsFormService);
  private readonly dineroForm = inject(DineroFormService);
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
    if (tab.path === 'planes') return t(PLANES_ADD_LABEL[this.planes.section()]);
    return t(`tabs.${tab.path}.add`);
  }

  protected add() {
    const path = TABS[this.active()].path;
    if (path === 'fijos') this.recurringForm.open();
    else if (path === 'dinero') this.dineroForm.openAccount();
    else if (path === 'planes') this.addInPlanes();
    else this.transactionForm.open();
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
    const i = TABS.findIndex((tab) => url.includes(`/tabs/${tab.path}`));
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
