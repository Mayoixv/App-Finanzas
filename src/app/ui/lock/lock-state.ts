import { inject, Injectable, signal } from '@angular/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { APP_CONTAINER } from '../../app.container';
import { PinCheck } from '../../application/use-cases/pin-lock';

const BIOMETRIC_KEY = 'biometric_unlock';

let startLocked = false;
let startLength: number | null = null;

/** Se llama en main.ts antes de arrancar Angular, para que no se vea ni un instante de datos sin el PIN. */
export function setInitialLock(enabled: boolean, length: number | null) {
  startLocked = enabled;
  startLength = length;
}

@Injectable({ providedIn: 'root' })
export class LockState {
  private readonly container = inject(APP_CONTAINER);

  readonly locked = signal(startLocked);
  /** Largo del PIN guardado; null si no se conoce (se muestran 6 bolitas y se entra con el botón). */
  readonly pinLength = signal(startLength);
  private enabled = startLocked;
  private hiddenAt = 0;
  /** Tiempo en segundo plano tras el que vuelve a pedir el PIN (se elige en Ajustes). */
  readonly lockAfterSeconds = signal(60);
  /** Desbloqueo con huella o rostro activado (requiere PIN, que queda de respaldo). */
  readonly biometricOn = signal(false);
  /** El diálogo de huella hace que la app pase a segundo plano un momento; esa salida no cuenta. */
  private authenticating = false;

  constructor() {
    this.container.pinLock.lockAfter().then((s) => this.lockAfterSeconds.set(s), console.error);
    this.container.settings
      ?.get(BIOMETRIC_KEY)
      .then((v) => this.biometricOn.set(v === '1' && Capacitor.isNativePlatform()), console.error);
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        // Solo cuenta salir de la app abierta; no el diálogo de huella ni salir con la app ya bloqueada.
        if (!this.authenticating && !this.locked()) this.hiddenAt = Date.now();
        return;
      }
      // La hora de salida se usa una sola vez: si quedara guardada, una vuelta posterior (por ejemplo, al cerrar
      // el diálogo de huella) la compararía de nuevo y volvería a bloquear en bucle.
      const away = this.hiddenAt;
      this.hiddenAt = 0;
      if (this.enabled && away && Date.now() - away >= this.lockAfterSeconds() * 1000) this.locked.set(true);
    });
  }

  /** Si el teléfono tiene huella o rostro registrados. */
  async biometryAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    return (await BiometricAuth.checkBiometry()).isAvailable;
  }

  /** Pide la huella; si se reconoce, desbloquea. Devuelve false si se canceló o falló. */
  async unlockWithBiometry(): Promise<boolean> {
    if (!this.biometricOn() || this.authenticating) return false;
    this.authenticating = true;
    try {
      await BiometricAuth.authenticate({
        reason: 'Desbloquear Kuarto',
        androidTitle: 'Desbloquear Kuarto',
        androidSubtitle: 'Usa tu huella o tu rostro',
        cancelTitle: 'Usar PIN',
        allowDeviceCredential: false,
        androidConfirmationRequired: false,
      });
      this.locked.set(false);
      return true;
    } catch {
      return false;
    } finally {
      this.authenticating = false;
    }
  }

  /** Activa la huella tras comprobarla una vez; la apaga sin preguntar. */
  async setBiometric(on: boolean): Promise<boolean> {
    if (on) {
      this.authenticating = true;
      try {
        await BiometricAuth.authenticate({
          reason: 'Confirmar tu huella',
          androidTitle: 'Usar huella o rostro',
          androidSubtitle: 'Confírmalo para activarlo en Kuarto',
          cancelTitle: 'Cancelar',
          androidConfirmationRequired: false,
        });
      } catch {
        return false;
      } finally {
        this.authenticating = false;
      }
    }
    await this.container.settings.set(BIOMETRIC_KEY, on ? '1' : '0');
    this.biometricOn.set(on);
    return true;
  }

  async setLockAfter(seconds: number) {
    await this.container.pinLock.setLockAfter(seconds);
    this.lockAfterSeconds.set(seconds);
  }

  async unlock(pin: string): Promise<PinCheck> {
    const check = await this.container.pinLock.verify(pin);
    if (check.ok) {
      this.locked.set(false);
      this.pinLength.set(pin.length);
    }
    return check;
  }

  /** Tras activar o quitar el PIN en Ajustes. */
  setEnabled(enabled: boolean, length: number | null = null) {
    this.enabled = enabled;
    this.pinLength.set(length);
  }
}
