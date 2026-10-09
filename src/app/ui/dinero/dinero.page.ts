import { Component, effect, inject, input, signal } from '@angular/core';
import { HelpButtonComponent } from '../help/help-button.component';
import { MonthSwitcherComponent } from '../month-switcher.component';
import { IonContent } from '@ionic/angular';
import { APP_CONTAINER } from '../../app.container';
import { NetWorth } from '../../application/use-cases/accounts';
import { CuentasViewComponent } from '../cuentas/cuentas-view.component';
import { formatMoney } from '../format';
import { MonthState } from '../month-state';

/** Pestaña Dinero: patrimonio arriba y, debajo, Cuentas, Efectivo y Tarjetas. Metas y deudas están en Planes. */
@Component({
  selector: 'app-dinero',
  templateUrl: 'dinero.page.html',
  styleUrls: ['dinero.page.scss'],
  imports: [HelpButtonComponent, MonthSwitcherComponent, IonContent, CuentasViewComponent],
})
export class DineroPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly monthState = inject(MonthState);

  /** `?ver=tarjetas` en la dirección lleva a ese grupo (desde alertas y notificaciones). */
  readonly ver = input<string>();

  protected readonly netWorth = signal<NetWorth | null>(null);
  protected readonly money = formatMoney;

  constructor() {
    effect(() => {
      this.monthState.version();
      this.load();
    });
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
