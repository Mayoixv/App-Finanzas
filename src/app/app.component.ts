import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { LockScreenComponent } from './ui/lock/lock-screen.component';
import { LockState } from './ui/lock/lock-state';
import { NotificationsService } from './ui/notifications.service';
import { AutoBackupService } from './ui/auto-backup.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, LockScreenComponent],
})
export class AppComponent {
  protected readonly lock = inject(LockState);
  /** Se crea al arrancar para que reprograme los avisos con cada cambio de datos. */
  private readonly notifications = inject(NotificationsService);
  /** Hace el respaldo semanal al abrir la app, si toca. */
  private readonly autoBackup = inject(AutoBackupService);
}
