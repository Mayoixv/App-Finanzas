import { effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { APP_CONTAINER } from '../app.container';
import { BudgetNotice, PaymentReminder } from '../application/use-cases/get-notification-plan';
import { addDays, monthOf } from '../domain/month';
import { formatMoney, todayIso } from './format';
import { deferPastQuiet, fitInSameDay } from './quiet-hours';
import { MonthState } from './month-state';
import { t } from './i18n';

const ENABLED_KEY = 'notifications_enabled';
/** Días hacia adelante que se programa el recordatorio diario; se reprograma cada vez que se abre la app. */
const DAILY_DAYS = 7;

/** Qué avisos quiere el usuario y a qué hora. */
export interface NotificationPrefs {
  fijos: boolean;
  budgets: boolean;
  daily: boolean;
  /** Hora de los recordatorios de fijos (0 a 23). */
  hour: number;
  /** Hora del recordatorio diario para registrar gastos. */
  dailyHour: number;
  /** Horas de silencio: ningún aviso suena entre quietStart y quietEnd. */
  quiet: boolean;
  quietStart: number;
  quietEnd: number;
}

const PREF_KEYS: Record<keyof NotificationPrefs, string> = {
  fijos: 'notify_fijos',
  budgets: 'notify_budgets',
  daily: 'notify_daily',
  hour: 'notify_hour',
  dailyHour: 'notify_daily_hour',
  quiet: 'notify_quiet',
  quietStart: 'notify_quiet_start',
  quietEnd: 'notify_quiet_end',
};

const DEFAULT_PREFS: NotificationPrefs = {
  fijos: true,
  budgets: true,
  daily: false,
  hour: 9,
  dailyHour: 20,
  quiet: false,
  quietStart: 22,
  quietEnd: 7,
};

function atHour(date: string, hour: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour);
}

/** Id numérico estable a partir de la clave (Android pide un entero de 32 bits). */
function idOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function reminderOf(r: PaymentReminder, hour: number): LocalNotificationSchema | null {
  const at = atHour(r.date, hour);
  if (at.getTime() <= Date.now()) return null;
  return {
    id: idOf(r.key),
    title: t(r.kind === 'tarjeta' ? (r.when === 'antes' ? 'notify.cardTomorrow' : 'notify.cardToday') : r.when === 'antes' ? 'notify.tomorrow' : 'notify.today', {
      name: r.name,
    }),
    body:
      r.kind === 'tarjeta'
        ? t('notify.cardBody', {
            amount: formatMoney(r.amount),
            minimum: r.minimum && r.minimum < r.amount ? t('notify.cardMinimum', { amount: formatMoney(r.minimum) }) : '',
          })
        : t('notify.fixedBody', { amount: formatMoney(r.amount) }),
    schedule: { at, allowWhileIdle: true },
    extra: { target: r.kind === 'tarjeta' ? '/tabs/dinero?ver=tarjetas' : '/tabs/fijos' },
  };
}

function budgetOf(b: BudgetNotice): LocalNotificationSchema {
  return {
    id: idOf(b.key),
    title: t(b.level === 'exceeded' ? 'notify.exceeded' : 'notify.near', { name: b.name }),
    body: t(b.level === 'exceeded' ? 'notify.exceededBody' : 'notify.nearBody', {
      spent: formatMoney(b.spent),
      limit: formatMoney(b.limit),
      left: formatMoney(b.limit - b.spent),
    }),
    extra: { target: '/tabs/inicio', kind: 'presupuesto' },
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
  readonly prefs = signal<NotificationPrefs>(DEFAULT_PREFS);
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
      this.queueSync();
    });
  }

  private queueSync(): Promise<void> {
    this.running = this.running.then(() => this.sync()).catch((e) => console.error(e));
    return this.running;
  }

  private async loadPrefs(): Promise<NotificationPrefs> {
    const read = async (key: keyof NotificationPrefs) => this.container.settings.get(PREF_KEYS[key]);
    const flag = async (key: 'fijos' | 'budgets' | 'daily' | 'quiet') => {
      const v = await read(key);
      return v ? v === '1' : DEFAULT_PREFS[key];
    };
    const hour = async (key: 'hour' | 'dailyHour' | 'quietStart' | 'quietEnd') => {
      const v = await read(key);
      const n = Number(v);
      return v && Number.isInteger(n) && n >= 0 && n <= 23 ? n : DEFAULT_PREFS[key];
    };
    const prefs = {
      fijos: await flag('fijos'),
      budgets: await flag('budgets'),
      daily: await flag('daily'),
      hour: await hour('hour'),
      dailyHour: await hour('dailyHour'),
      quiet: await flag('quiet'),
      quietStart: await hour('quietStart'),
      quietEnd: await hour('quietEnd'),
    };
    this.prefs.set(prefs);
    return prefs;
  }

  /** Activa los avisos pidiendo permiso a Android. Devuelve false si el usuario lo niega. */
  async enable(): Promise<boolean> {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== 'granted') return false;
    await this.container.settings.set(ENABLED_KEY, '1');
    this.enabled.set(true);
    await this.queueSync();
    return true;
  }

  async setPref<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]): Promise<void> {
    await this.container.settings.set(PREF_KEYS[key], String(typeof value === 'boolean' ? Number(value) : value));
    this.prefs.update((p) => ({ ...p, [key]: value }));
    await this.queueSync();
  }

  async disable(): Promise<void> {
    await this.container.settings.set(ENABLED_KEY, '0');
    this.enabled.set(false);
    await this.cancelPending();
  }

  private async sync(): Promise<void> {
    this.enabled.set((await this.container.settings.get(ENABLED_KEY)) === '1');
    const prefs = await this.loadPrefs();
    if (!this.enabled()) return;
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;

    const today = todayIso();
    const plan = await this.container.getNotificationPlan.execute(today);

    // Todo lo programado se rehace: así un fijo pagado, editado o borrado, o un aviso apagado, deja de sonar.
    await this.cancelPending(true);
    const reminders = prefs.fijos
      ? plan.reminders.map((r) => reminderOf(r, prefs.hour)).filter((n): n is LocalNotificationSchema => n !== null)
      : [];
    const daily = prefs.daily ? await this.dailyReminders(today, prefs.dailyHour) : [];

    // Presupuestos: una vez por umbral, categoría y mes. Si ya se pasó, no se avisa además el 85%.
    const exceeded = new Set(plan.budgets.filter((b) => b.level === 'exceeded').map((b) => b.name));
    const budgets: LocalNotificationSchema[] = [];
    for (const b of prefs.budgets ? plan.budgets : []) {
      const seen = `notified:${b.key}`;
      if (await this.container.settings.get(seen)) continue;
      await this.container.settings.set(seen, '1');
      if (b.level === 'warning' && exceeded.has(b.name)) continue;
      budgets.push(budgetOf(b));
    }

    const all = [...reminders, ...daily, ...budgets];
    // Horas de silencio. Los recordatorios dicen "hoy" o "mañana": se mueven sin cambiar de día. Los avisos de
    // presupuesto (sin hora) suenan al terminar el silencio.
    if (prefs.quiet) {
      for (const n of all) {
        const at = n.schedule?.at;
        const moved = at ? fitInSameDay(at, prefs.quietStart, prefs.quietEnd) : deferPastQuiet(new Date(), prefs.quietStart, prefs.quietEnd);
        if (!at || moved !== at) {
          if (moved.getTime() > Date.now()) n.schedule = { at: moved, allowWhileIdle: true };
        }
      }
    }
    if (all.length) await LocalNotifications.schedule({ notifications: all });
  }

  /** "¿Registraste tus gastos de hoy?" los próximos días; hoy no, si ya se registró algo hoy o ya pasó la hora. */
  private async dailyReminders(today: string, hour: number): Promise<LocalNotificationSchema[]> {
    const registeredToday = (await this.container.transactions.listByMonth(monthOf(today))).some((t) => t.date === today);
    const out: LocalNotificationSchema[] = [];
    for (let i = registeredToday ? 1 : 0; i < DAILY_DAYS; i++) {
      const date = addDays(today, i);
      const at = atHour(date, hour);
      if (at.getTime() <= Date.now()) continue;
      out.push({
        id: idOf(`diario:${date}`),
        title: t('notify.dailyTitle'),
        body: t('notify.dailyBody'),
        schedule: { at, allowWhileIdle: true },
        extra: { target: '/tabs/movimientos' },
      });
    }
    return out;
  }

  /**
   * Cancela lo programado para volver a calcularlo. Con `keepBudgets`, deja los avisos de presupuesto: se avisan una
   * sola vez y, si las horas de silencio los pospusieron, recalcular no los volvería a crear.
   */
  private async cancelPending(keepBudgets = false) {
    const { notifications } = await LocalNotifications.getPending();
    const ids = notifications.filter((n) => !(keepBudgets && n.extra?.kind === 'presupuesto')).map((n) => ({ id: n.id }));
    if (ids.length) await LocalNotifications.cancel({ notifications: ids });
  }
}
