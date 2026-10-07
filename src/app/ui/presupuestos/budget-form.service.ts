import { inject, Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Budget } from '../../domain/budget';
import { MonthState } from '../month-state';
import { PresupuestoModalComponent } from './presupuesto.modal';

/** Abre el formulario de presupuesto (nuevo o para editar uno) y recarga al cerrarse. */
@Injectable({ providedIn: 'root' })
export class BudgetFormService {
  private readonly modals = inject(ModalController);
  private readonly monthState = inject(MonthState);
  private isOpen = false;

  /** `taken`: categorías que ya están en otro presupuesto del mes, para no ofrecerlas. */
  async open(budget: Budget | undefined, taken: string[]) {
    if (this.isOpen) return;
    this.isOpen = true;
    try {
      const modal = await this.modals.create({
        component: PresupuestoModalComponent,
        componentProps: { budget, taken },
      });
      await modal.present();
      await modal.onWillDismiss();
      this.monthState.notifyChange();
    } finally {
      this.isOpen = false;
    }
  }
}
