import { fromB64, pbkdf2, randomBytes, toB64 } from '../backup-crypto';
import { ValidationError } from '../errors';
import { ISettingsRepository } from '../ports/repositories';

const FREE_ATTEMPTS = 5;
const FIRST_WAIT_MS = 30_000;
const MAX_WAIT_MS = 15 * 60_000;

export type PinCheck = { ok: true } | { ok: false; waitSeconds: number };

/**
 * PIN de la app. Se guarda solo su hash PBKDF2 con salt. Tras 5 fallos hay que esperar 30 s, y el tiempo
 * se duplica con cada fallo siguiente (máximo 15 min). Los fallos se guardan para que reiniciar no los borre.
 */
/** Segundos en segundo plano tras los que se vuelve a pedir el PIN: inmediato, 1, 5 o 15 minutos. */
export const LOCK_AFTER_OPTIONS = [0, 60, 300, 900] as const;
const DEFAULT_LOCK_AFTER = 60;

export class PinLock {
  constructor(private readonly settings: ISettingsRepository) {}

  async isEnabled(): Promise<boolean> {
    return !!(await this.settings.get('pin_hash'));
  }

  async lockAfter(): Promise<number> {
    const stored = await this.settings.get('lock_after');
    const n = Number(stored);
    return stored && (LOCK_AFTER_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_LOCK_AFTER;
  }

  async setLockAfter(seconds: number): Promise<void> {
    if (!(LOCK_AFTER_OPTIONS as readonly number[]).includes(seconds)) throw new ValidationError('Tiempo de bloqueo no válido');
    await this.settings.set('lock_after', String(seconds));
  }

  /** Cuántos números tiene el PIN, para dibujar las bolitas justas; null si se creó antes de guardarlo. */
  async length(): Promise<number | null> {
    const n = Number(await this.settings.get('pin_length'));
    return n >= 4 && n <= 6 ? n : null;
  }

  async enable(pin: string): Promise<void> {
    if (!/^\d{4,6}$/.test(pin)) throw new ValidationError('El PIN debe tener de 4 a 6 números');
    const salt = randomBytes(16);
    await this.settings.set('pin_salt', toB64(salt));
    await this.settings.set('pin_hash', toB64(new Uint8Array(await pbkdf2(pin, salt))));
    await this.settings.set('pin_length', String(pin.length));
    await this.resetFailures();
  }

  async verify(pin: string, now = Date.now()): Promise<PinCheck> {
    const lockedUntil = Number((await this.settings.get('pin_locked_until')) ?? 0);
    if (lockedUntil > now) return { ok: false, waitSeconds: Math.ceil((lockedUntil - now) / 1000) };

    const [hash, salt] = [await this.settings.get('pin_hash'), await this.settings.get('pin_salt')];
    if (!hash || !salt) return { ok: true };
    if (toB64(new Uint8Array(await pbkdf2(pin, fromB64(salt)))) === hash) {
      await this.settings.set('pin_length', String(pin.length));
      await this.resetFailures();
      return { ok: true };
    }

    const failures = Number((await this.settings.get('pin_failures')) ?? 0) + 1;
    await this.settings.set('pin_failures', String(failures));
    if (failures < FREE_ATTEMPTS) return { ok: false, waitSeconds: 0 };
    const wait = Math.min(FIRST_WAIT_MS * 2 ** (failures - FREE_ATTEMPTS), MAX_WAIT_MS);
    await this.settings.set('pin_locked_until', String(now + wait));
    return { ok: false, waitSeconds: wait / 1000 };
  }

  async disable(pin: string): Promise<PinCheck> {
    const check = await this.verify(pin);
    if (check.ok) {
      await this.settings.set('pin_hash', '');
      await this.settings.set('pin_salt', '');
      await this.settings.set('pin_length', '');
    }
    return check;
  }

  private async resetFailures() {
    await this.settings.set('pin_failures', '0');
    await this.settings.set('pin_locked_until', '0');
  }
}
