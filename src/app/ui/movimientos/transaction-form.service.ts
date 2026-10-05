import { inject, Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Transaction } from '../../domain/transaction';
import { MonthState } from '../month-state';
import { NuevaTransaccionModalComponent } from './nueva-transaccion.modal';

/** Abre el formulario de movimiento (nuevo o para editar uno) y recarga los datos al cerrarse. */
@Injectable({ providedIn: 'root' })
export class TransactionFormService {
  private readonly modals = inject(ModalController);
  private readonly monthState = inject(MonthState);
  private isOpen = false;

  /** `copyOf`: abre un movimiento nuevo con los datos de otro (Duplicar), con la fecha de hoy. */
  async open(transaction?: Transaction, copyOf?: Transaction) {
    // Un doble toque en el botón + no debe abrir dos formularios.
    if (this.isOpen) return;
    this.isOpen = true;
    try {
      const modal = await this.modals.create({
        component: NuevaTransaccionModalComponent,
        componentProps: { transaction, copyOf },
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
