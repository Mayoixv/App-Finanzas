import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { MonthState } from './month-state';

/** Aviso de 5 segundos con "Deshacer" tras borrar algo. */
@Injectable({ providedIn: 'root' })
export class UndoService {
  private readonly toasts = inject(ToastController);
  private readonly monthState = inject(MonthState);

  async offer(message: string, undo: () => Promise<void>) {
    const toast = await this.toasts.create({
      message,
      duration: 5000,
      position: 'top',
      cssClass: 'app-toast',
      buttons: [{ text: 'Deshacer', role: 'undo' }],
    });
    await toast.present();
    const { role } = await toast.onDidDismiss();
    if (role !== 'undo') return;
    try {
      await undo();
    } finally {
      this.monthState.notifyChange();
    }
  }
}
