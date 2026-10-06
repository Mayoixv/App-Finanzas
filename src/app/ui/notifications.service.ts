import { effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { APP_CONTAINER } from '../app.container';
import { BudgetNotice, PaymentReminder } from '../application/use-cases/get-notification-plan';
import { formatMoney, todayIso } from './format';
import { MonthState } from './month-state';

const ENABLED_KEY = 'notifications_enabled';
/** Hora a la que salen los recordatorios de fijos. */
// ponytail: fija a las 9:00; se vuelve configurable en el paso de preferencias de avisos.
const REMINDER_HOUR = 9;

/** Id numérico estable a partir de la clave (Android pide un entero de 32 bits). */
function idOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function reminderOf(r: PaymentReminder): LocalNotificationSchema | null {
  const [y, m, d] = r.date.split('-').map(Number);
  const at = new Date(y, m - 1, d, REMINDER_HOUR);
  if (at.getTime() <= Date.now()) return null;
  return {
    id: idOf(r.key),
    title: r.when === 'antes' ? `Mañana vence ${r.name}` : `Hoy vence ${r.name}`,
    body: `${formatMoney(r.amount)} · Márcalo como pagado en Fijos.`,
    schedule: { at, allowWhileIdle: true },
    extra: { target: '/tabs/fijos' },
  };
}

function budgetOf(b: BudgetNotice): LocalNotificationSchema {
  return {
    id: idOf(b.key),
    title: b.level === 'exceeded' ? `Te pasaste en ${b.name}` : `Cerca del límite en ${b.name}`,
    body:
      b.level === 'exceeded'
        ? `Llevas ${formatMoney(b.spent)} de ${formatMoney(b.limit)} este mes.`
        : `Llevas ${formatMoney(b.spent)} de ${formatMoney(b.limit)}; te quedan ${formatMoney(b.limit - b.spent)}.`,
    extra: { target: '/tabs/inicio' },
  };
}

/** Notificaciones del sistema: recordatorios de fijos y avisos de presupuesto. Solo en el teléfono. */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly container = inject(APP_CONTAINER);
  private readonly monthState = inject(MonthState);
  private readonly router = inject(Router);

  readonly available = Capacitor.isNativePlatform();
  readonly enabled = signal(false);
  /** Una sincronización a la vez: dos seguidas podrían borrar lo que la otra acaba de programar. */
  private running: Promise<void> = Promise.resolve();

  constructor() {
    if (!this.available) return;
    LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      const target = notification.extra?.target;
      if (typeof target === 'string') this.router.navigateByUrl(target);
    });
    effect(() => {
      // Cada cambio de datos (guardar, pagar, borrar) vuelve a calcular los avisos.
      this.monthState.version();
      this.running = this.running.then(() => this.sync()).catch((e) => console.error(e));
    });
  }

  /** Activa los avisos pidiendo permiso a Android. Devuelve false si el usuario lo niega. */
  async enable(): Promise<boolean> {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== 'granted') return false;
    await this.container.settings.set(ENABLED_KEY, '1');
    this.enabled.set(true);
    await this.sync();
    return true;
  }

  async disable(): Promise<void> {
    await this.container.settings.set(ENABLED_KEY, '0');
    this.enabled.set(false);
    await this.cancelPending();
  }

  private async sync(): Promise<void> {
    this.enabled.set((await this.container.settings.get(ENABLED_KEY)) === '1');
    if (!this.enabled()) return;
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;

    const plan = await this.container.getNotificationPlan.execute(todayIso());

    // Los recordatorios se reprograman completos: así un fijo pagado, editado o borrado deja de avisar.
    await this.cancelPending();
    const reminders = plan.reminders.map(reminderOf).filter((n): n is LocalNotificationSchema => n !== null);

    // Presupuestos: una vez por umbral, categoría y mes. Si ya se pasó, no se avisa además el 85%.
    const exceeded = new Set(plan.budgets.filter((b) => b.level === 'exceeded').map((b) => b.name));
    const budgets: LocalNotificationSchema[] = [];
    for (const b of plan.budgets) {
      const seen = `notified:${b.key}`;
      if (await this.container.settings.get(seen)) continue;
      await this.container.settings.set(seen, '1');
      if (b.level === 'warning' && exceeded.has(b.name)) continue;
      budgets.push(budgetOf(b));
    }

    const all = [...reminders, ...budgets];
    if (all.length) await LocalNotifications.schedule({ notifications: all });
  }

  private async cancelPending() {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications.length) await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
  }
}
