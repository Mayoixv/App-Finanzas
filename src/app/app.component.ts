import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { LockScreenComponent } from './ui/lock/lock-screen.component';
import { LockState } from './ui/lock/lock-state';
import { NotificationsService } from './ui/notifications.service';
import { AutoBackupService } from './ui/auto-backup.service';
import { TourComponent } from './ui/tour/tour.component';
import { UpdateService } from './ui/update/update.service';
import { NewsService } from './ui/news/news.service';

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
  /** Busca una versión nueva al abrir la app, una vez al día. */
  private readonly update = inject(UpdateService);

  constructor() {
    // Un momento después de abrir, para no tapar la primera pantalla mientras carga.
    const news = inject(NewsService);
    setTimeout(() => news.showIfUpdated().catch(console.error), 1500);
  }
}
