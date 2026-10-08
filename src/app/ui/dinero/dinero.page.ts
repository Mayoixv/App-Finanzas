import { Component, effect, inject, input, signal } from '@angular/core';
import { HelpButtonComponent } from '../help/help-button.component';
import { MonthSwitcherComponent } from '../month-switcher.component';
import { IonContent } from '@ionic/angular';
import { APP_CONTAINER } from '../../app.container';
import { NetWorth } from '../../application/use-cases/accounts';
import { MetasViewComponent } from '../ahorro/metas-view.component';
import { CuentasViewComponent } from '../cuentas/cuentas-view.component';
import { DeudasViewComponent } from '../deudas/deudas-view.component';
import { formatMoney } from '../format';
import { MonthState } from '../month-state';
import { PillOption, PillToggleComponent } from '../pill-toggle.component';
import { DINERO_SECTIONS, DineroSection, DineroState } from './dinero-state';

/** Pestaña Dinero: patrimonio arriba y, debajo, cuentas, tarjetas, metas de ahorro o deudas. */
@Component({
  selector: 'app-dinero',
  templateUrl: 'dinero.page.html',
  styleUrls: ['dinero.page.scss'],
  imports: [HelpButtonComponent, MonthSwitcherComponent, IonContent, PillToggleComponent, CuentasViewComponent, MetasViewComponent, DeudasViewComponent],
})
export class DineroPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly monthState = inject(MonthState);
  protected readonly state = inject(DineroState);

  /** `?ver=tarjetas` en la dirección abre esa sección (desde alertas y notificaciones). */
  readonly ver = input<string>();

  protected readonly netWorth = signal<NetWorth | null>(null);
  protected readonly money = formatMoney;
  protected readonly options: PillOption[] = [
    { value: 'cuentas', label: 'Cuentas' },
    { value: 'tarjetas', label: 'Tarjetas' },
    { value: 'metas', label: 'Metas' },
    { value: 'deudas', label: 'Deudas' },
  ];

  constructor() {
    effect(() => {
      const ver = this.ver();
      if (ver && (DINERO_SECTIONS as string[]).includes(ver)) this.state.section.set(ver as DineroSection);
    });
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected setSection(value: string) {
    this.state.section.set(value as DineroSection);
  }

  private async load() {
    try {
      this.netWorth.set(await this.container.getNetWorth.execute());
    } catch (error) {
      // El resumen es una ayuda: si falla, las secciones siguen funcionando.
      console.error(error);
    }
  }
}
