import { effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { APP_CONTAINER } from '../../app.container';
import { RawNotification } from '../../application/use-cases/bank-imports';
import { MonthState } from '../month-state';

/** Plugin nativo propio (android/.../BankNotificationsPlugin.java). */
interface BankNotificationsPlugin {
  isEnabled(): Promise<{ enabled: boolean }>;
  openSettings(): Promise<void>;
  drain(): Promise<{ items: RawNotification[] }>;
  takeRoute(): Promise<{ route: string | null }>;
  getNotifyPurchases(): Promise<{ enabled: boolean }>;
  setNotifyPurchases(options: { enabled: boolean }): Promise<void>;
  addListener(event: 'posted', cb: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'open', cb: (data: { route: string }) => void): Promise<PluginListenerHandle>;
}

const BankNotifications = registerPlugin<BankNotificationsPlugin>('BankNotifications');

/**
 * Pasa a "Por confirmar" las compras que el servicio de Android guardó de las notificaciones del banco.
 * Lo hace al abrir la app, al volver a ella y en cuanto llega un aviso con la app abierta.
 */
@Injectable({ providedIn: 'root' })
export class BankNotificationsService {
  private readonly container = inject(APP_CONTAINER);
  private readonly monthState = inject(MonthState);
  private readonly router = inject(Router);

  /** Solo existe en el teléfono Android. */
  readonly available = Capacitor.getPlatform() === 'android';
  /** Si el usuario dio el permiso de leer notificaciones. */
  readonly enabled = signal(false);
  /** Cuántas compras esperan confirmación. */
  readonly pending = signal(0);
  /** Notificación propia "Compra por confirmar" al llegar cada aviso. */
  readonly notifyPurchases = signal(true);
  private syncing = false;

  constructor() {
    if (this.available) {
      BankNotifications.addListener('posted', () => this.sync()).catch(console.error);
      // Tocar la notificación con la app abierta, o abrirla desde ella.
      BankNotifications.addListener('open', ({ route }) => this.router.navigateByUrl(route)).catch(console.error);
      BankNotifications.takeRoute()
        .then(({ route }) => {
          if (route) this.router.navigateByUrl(route);
        })
        .catch(console.error);
      BankNotifications.getNotifyPurchases()
        .then(({ enabled }) => this.notifyPurchases.set(enabled))
        .catch(console.error);
      App.addListener('resume', () => this.sync()).catch(console.error);
    }
    // Al confirmar, descartar o cambiar datos, se vuelve a contar lo pendiente.
    effect(() => {
      this.monthState.version();
      this.count();
    });
    this.sync();
  }

  async sync() {
    if (this.syncing) return;
    this.syncing = true;
    try {
      if (this.available) {
        this.enabled.set((await BankNotifications.isEnabled()).enabled);
        const { items } = await BankNotifications.drain();
        if (items.length) {
          const { added, reversed } = await this.container.ingestBankNotifications.execute(items);
          if (added || reversed) this.monthState.notifyChange();
        }
      }
      await this.count();
    } catch (e) {
      console.error('No se pudieron leer los avisos del banco', e);
    } finally {
      this.syncing = false;
    }
  }

  openSettings() {
    return BankNotifications.openSettings();
  }

  /** Al activar el aviso de cada compra, pide el permiso de notificaciones si Android aún no lo dio. */
  async setNotifyPurchases(enabled: boolean) {
    if (enabled && (await LocalNotifications.checkPermissions()).display !== 'granted') {
      if ((await LocalNotifications.requestPermissions()).display !== 'granted') enabled = false;
    }
    await BankNotifications.setNotifyPurchases({ enabled });
    this.notifyPurchases.set(enabled);
  }

  private async count() {
    try {
      this.pending.set((await this.container.listPendingImports.execute()).length);
    } catch (e) {
      console.error(e);
    }
  }
}
