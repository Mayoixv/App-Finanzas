import { inject, Injectable, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { APP_CONTAINER } from '../../app.container';
import { PinCheck } from '../../application/use-cases/pin-lock';

/** Tras este tiempo en segundo plano la app vuelve a pedir el PIN. */
// ponytail: fijo en 1 minuto; hacerlo configurable (inmediato, 1, 5, 15) cuando alguien lo pida.
const LOCK_AFTER_MS = 60_000;

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

  constructor() {
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) this.hiddenAt = Date.now();
      else if (this.enabled && Date.now() - this.hiddenAt > LOCK_AFTER_MS) this.locked.set(true);
    });
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
