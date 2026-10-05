import { inject, Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { RecurringExpense } from '../../domain/recurring-expense';
import { MonthState } from '../month-state';
import { NuevoGastoFijoModalComponent } from './nuevo-gasto-fijo.modal';

/** Abre el formulario de gasto fijo (nuevo o para editar uno) y recarga los datos al cerrarse. */
@Injectable({ providedIn: 'root' })
export class RecurringFormService {
  private readonly modals = inject(ModalController);
  private readonly monthState = inject(MonthState);
  private isOpen = false;

  async open(expense?: RecurringExpense) {
    // Un doble toque en el botón + no debe abrir dos formularios.
    if (this.isOpen) return;
    this.isOpen = true;
    try {
      const modal = await this.modals.create({
        component: NuevoGastoFijoModalComponent,
        componentProps: { expense },
      });
      await modal.present();
      await modal.onWillDismiss();
      // Se recarga siempre: si el usuario cierra durante el check de éxito, lo guardado igual debe verse.
      this.monthState.notifyChange();
    } finally {
      this.isOpen = false;
    }
  }
}
