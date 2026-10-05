import { inject, Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SavingsGoal } from '../../domain/savings';
import { MonthState } from '../month-state';
import { AporteModalComponent } from './aporte.modal';
import { MetaModalComponent } from './meta.modal';

/** Abre los formularios de ahorro (meta nueva o editada, aporte a una meta) y recarga al cerrarse. */
@Injectable({ providedIn: 'root' })
export class SavingsFormService {
  private readonly modals = inject(ModalController);
  private readonly monthState = inject(MonthState);
  private isOpen = false;

  openGoal(goal?: SavingsGoal) {
    return this.open(MetaModalComponent, { goal });
  }

  openContribution(goal: SavingsGoal) {
    return this.open(AporteModalComponent, { goal });
  }

  private async open(component: unknown, componentProps: Record<string, unknown>) {
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
