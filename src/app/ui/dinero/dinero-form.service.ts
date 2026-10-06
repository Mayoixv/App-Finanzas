import { inject, Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AccountView } from '../../application/use-cases/accounts';
import { AccountType, Transfer } from '../../domain/account';
import { CuentaModalComponent } from '../cuentas/cuenta.modal';
import { TransferenciaModalComponent } from '../cuentas/transferencia.modal';
import { MonthState } from '../month-state';

/** Abre los formularios de la pestaña Dinero (cuentas, tarjetas, transferencias, deudas) y recarga al cerrarse. */
@Injectable({ providedIn: 'root' })
export class DineroFormService {
  private readonly modals = inject(ModalController);
  private readonly monthState = inject(MonthState);
  private isOpen = false;

  openAccount(view?: AccountView, presetType?: AccountType) {
    return this.open(CuentaModalComponent, { view, presetType });
  }

  openTransfer(toAccountId?: string, suggestedAmount?: number) {
    return this.open(TransferenciaModalComponent, { toAccountId, suggestedAmount });
  }

  editTransfer(transfer: Transfer) {
    return this.open(TransferenciaModalComponent, { transfer });
  }

  async open(component: unknown, componentProps: Record<string, unknown>) {
    // Un doble toque no debe abrir dos formularios.
    if (this.isOpen) return;
    this.isOpen = true;
    try {
      const modal = await this.modals.create({ component: component as never, componentProps });
      await modal.present();
      await modal.onWillDismiss();
      this.monthState.notifyChange();
    } finally {
      this.isOpen = false;
    }
  }
}
