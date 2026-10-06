import { inject, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { APP_CONTAINER } from '../app.container';
import { saveAutoBackup } from './backup-files';
import { todayIso } from './format';

/** Respaldo automático semanal: al abrir la app, si toca, lo crea y lo guarda en Documentos/Finanzas. */
@Injectable({ providedIn: 'root' })
export class AutoBackupService {
  private readonly container = inject(APP_CONTAINER);

  readonly available = Capacitor.isNativePlatform();
  readonly enabled = signal(false);
  /** Fecha ISO del último respaldo automático guardado. */
  readonly lastRun = signal<string | null>(null);
  readonly lastError = signal(false);

  constructor() {
    if (!this.available) return;
    // Un poco después de abrir, para no retrasar la primera pantalla (cifrar tarda un momento).
    setTimeout(() => this.runIfDue().catch((e) => console.error(e)), 3000);
  }

  async refresh(): Promise<void> {
    this.enabled.set(await this.container.autoBackup.isEnabled());
    this.lastRun.set(await this.container.autoBackup.lastRun());
  }

  async runIfDue(): Promise<void> {
    await this.refresh();
    if (await this.container.autoBackup.isDue(todayIso())) await this.runNow();
  }

  /** Hace el respaldo ya (al activarlo o si toca). Devuelve false si no se pudo guardar. */
  async runNow(): Promise<boolean> {
    try {
      await saveAutoBackup(await this.container.autoBackup.create());
      await this.container.autoBackup.markDone(todayIso());
      this.lastError.set(false);
      return true;
    } catch (error) {
      // Si falla (por ejemplo, sin espacio), se vuelve a intentar la próxima vez que se abra la app.
      console.error(error);
      this.lastError.set(true);
      return false;
    } finally {
      await this.refresh();
    }
  }

  async enable(password: string): Promise<boolean> {
    await this.container.autoBackup.enable(password);
    return this.runNow();
  }

  async disable(): Promise<void> {
    await this.container.autoBackup.disable();
    await this.refresh();
  }
}
