import { Component, inject, signal, viewChild } from '@angular/core';
import { IonSelect, IonSelectOption, IonToggle } from '@ionic/angular';
import { NotificationPrefs, NotificationsService } from '../notifications.service';

/** Horas que se ofrecen, de 6:00 a 22:00. */
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

/** Sección "Avisos" de Ajustes: activar las notificaciones, elegir cuáles y a qué hora. */
@Component({
  selector: 'app-avisos',
  templateUrl: 'avisos.component.html',
  styleUrls: ['avisos.component.scss'],
  imports: [IonToggle, IonSelect, IonSelectOption],
})
export class AvisosComponent {
  protected readonly notifications = inject(NotificationsService);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly hours = HOURS;
  private readonly mainToggle = viewChild<IonToggle>('main');

  protected hourLabel(h: number): string {
    return `${h}:00`;
  }

  protected async toggle(on: boolean) {
    if (on === this.notifications.enabled()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (!on) await this.notifications.disable();
      else if (!(await this.notifications.enable())) {
        this.error.set(
          'Android no dio permiso para notificar. Actívalo en Ajustes del teléfono › Aplicaciones › Finanzas › Notificaciones.',
        );
      }
    } catch (e) {
      console.error(e);
      this.error.set('No se pudieron cambiar las notificaciones. Inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
      // El interruptor cambia solo al tocarlo; si no se pudo, vuelve a mostrar el estado real.
      const toggle = this.mainToggle();
      if (toggle) toggle.checked = this.notifications.enabled();
    }
  }

  protected async set<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    this.error.set('');
    try {
      await this.notifications.setPref(key, value);
    } catch (e) {
      console.error(e);
      this.error.set('No se pudo guardar el cambio. Inténtalo de nuevo.');
    }
  }
}
