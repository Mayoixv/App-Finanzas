import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { LockScreenComponent } from './ui/lock/lock-screen.component';
import { LockState } from './ui/lock/lock-state';
import { NotificationsService } from './ui/notifications.service';
import { AutoBackupService } from './ui/auto-backup.service';
import { TourComponent } from './ui/tour/tour.component';
import { BankNotificationsService } from './ui/importar/bank-notifications.service';
import { UpdateService } from './ui/update/update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, LockScreenComponent, TourComponent],
})
export class AppComponent {
  protected readonly lock = inject(LockState);
  /** Se crea al arrancar para que reprograme los avisos con cada cambio de datos. */
  private readonly notifications = inject(NotificationsService);
  /** Hace el respaldo semanal al abrir la app, si toca. */
  private readonly autoBackup = inject(AutoBackupService);
  /** Pasa a "Por confirmar" las compras de los avisos del banco al abrir y al volver a la app. */
  private readonly bankNotifications = inject(BankNotificationsService);
  /** Busca una versión nueva al abrir la app, una vez al día. */
  private readonly update = inject(UpdateService);
}
