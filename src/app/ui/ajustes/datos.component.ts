import { Component, inject, OnInit, signal } from '@angular/core';
import { AlertController, IonIcon, LoadingController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { ValidationError } from '../../application/errors';
import { fileDate, pickTextFile, saveFile } from '../file-io';
import { monthLabel } from '../format';
import { LockState } from '../lock/lock-state';

type Values = Record<string, string>;

/** Secciones "Tus datos" (respaldo, restauración, CSV) y "Bloqueo con PIN" de Ajustes. */
@Component({
  selector: 'app-datos',
  templateUrl: 'datos.component.html',
  styleUrls: ['datos.component.scss'],
  imports: [IonIcon],
})
export class DatosComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly alerts = inject(AlertController);
  private readonly loading = inject(LoadingController);
  private readonly lock = inject(LockState);

  protected readonly pinEnabled = signal(false);
  protected readonly status = signal('');

  constructor() {
    addIcons({ chevronForward });
  }

  async ngOnInit() {
    this.pinEnabled.set(await this.container.pinLock.isEnabled());
  }

  protected async createBackup() {
    const values = await this.ask(
      'Crear respaldo',
      'Elige una contraseña para cifrar el respaldo. Si la olvidas, el respaldo no se puede abrir.',
      [
        { name: 'p1', type: 'password', placeholder: 'Contraseña (mínimo 6)', attributes: { autocomplete: 'new-password' } },
        { name: 'p2', type: 'password', placeholder: 'Repite la contraseña', attributes: { autocomplete: 'new-password' } },
      ],
      'Crear',
    );
    if (!values) return;
    if (values['p1'] !== values['p2']) return this.fail('Las contraseñas no coinciden.');
    await this.busy('Cifrando respaldo…', async () => {
      const file = await this.container.createBackup.execute(values['p1']);
      await saveFile(`finanzas-respaldo-${fileDate()}.finanzas`, file, 'application/json');
      this.status.set('Respaldo creado. Guárdalo fuera del teléfono (Drive, correo).');
    });
  }

  protected async restoreBackup() {
    const text = await pickTextFile('.finanzas,application/json');
    if (!text) return;
    const values = await this.ask('Restaurar respaldo', 'Escribe la contraseña con la que creaste el respaldo.', [
      { name: 'p', type: 'password', placeholder: 'Contraseña', attributes: { autocomplete: 'current-password' } },
    ], 'Abrir');
    if (!values) return;

    const opened = await this.busy('Abriendo respaldo…', () => this.container.openBackup.execute(text, values['p']));
    if (!opened) return;
    const { transactions, firstMonth, lastMonth } = opened.summary;
    const range = !firstMonth || !lastMonth
      ? ''
      : firstMonth === lastMonth
        ? ` (de ${monthLabel(firstMonth)})`
        : ` (de ${monthLabel(firstMonth)} a ${monthLabel(lastMonth)})`;
    const confirm = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Reemplazar tus datos',
      message: `El respaldo tiene ${transactions} movimientos${range}. Restaurarlo borra TODOS los datos actuales de la app y los cambia por los del respaldo.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Restaurar', role: 'destructive' },
      ],
    });
    await confirm.present();
    if ((await confirm.onDidDismiss()).role !== 'destructive') return;

    const done = await this.busy('Restaurando…', async () => {
      await this.container.restoreBackup.execute(opened.data);
      return true;
    });
    // Recargar es la forma más simple de que cada pantalla, la moneda y el PIN tomen los datos nuevos.
    if (done) location.reload();
  }

  protected async exportCsv() {
    await this.busy('Preparando archivo…', async () => {
      const { csv, rows } = await this.container.exportCsv.execute();
      await saveFile(`finanzas-movimientos-${fileDate()}.csv`, csv, 'text/csv');
      this.status.set(`Exportados ${rows} movimientos.`);
    });
  }

  protected async enablePin() {
    const values = await this.ask(
      this.pinEnabled() ? 'Cambiar PIN' : 'Activar bloqueo con PIN',
      'De 4 a 6 números. Si lo olvidas no hay forma de recuperarlo: tendrías que borrar la app y restaurar un respaldo.',
      [
        { name: 'p1', type: 'password', placeholder: 'PIN nuevo', attributes: { inputmode: 'numeric', maxlength: 6 } },
        { name: 'p2', type: 'password', placeholder: 'Repite el PIN', attributes: { inputmode: 'numeric', maxlength: 6 } },
      ],
      'Guardar',
    );
    if (!values) return;
    if (values['p1'] !== values['p2']) return this.fail('Los PIN no coinciden.');
    const ok = await this.busy('Guardando PIN…', async () => {
      await this.container.pinLock.enable(values['p1']);
      return true;
    });
    if (!ok) return;
    this.pinEnabled.set(true);
    this.lock.setEnabled(true, values['p1'].length);
    this.status.set('Bloqueo con PIN activado.');
  }

  protected async disablePin() {
    const values = await this.ask('Quitar PIN', 'Escribe tu PIN actual.', [
      { name: 'p', type: 'password', placeholder: 'PIN actual', attributes: { inputmode: 'numeric', maxlength: 6 } },
    ], 'Quitar');
    if (!values) return;
    const check = await this.busy('Comprobando…', () => this.container.pinLock.disable(values['p']));
    if (!check) return;
    if (!check.ok) {
      return this.fail(check.waitSeconds ? `Demasiados intentos. Espera ${check.waitSeconds} s.` : 'PIN incorrecto.');
    }
    this.pinEnabled.set(false);
    this.lock.setEnabled(false);
    this.status.set('Bloqueo con PIN desactivado.');
  }

  private async ask(header: string, message: string, inputs: object[], okText: string): Promise<Values | null> {
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header,
      message,
      inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: okText, role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    return role === 'confirm' ? (data?.values as Values) : null;
  }

  /** Muestra "cargando" mientras corre `work`; los errores se explican y devuelven undefined. */
  private async busy<T>(message: string, work: () => Promise<T>): Promise<T | undefined> {
    const spinner = await this.loading.create({ message });
    await spinner.present();
    try {
      return await work();
    } catch (error) {
      if (!(error instanceof ValidationError)) console.error(error);
      await spinner.dismiss();
      await this.fail(error instanceof ValidationError ? error.message : 'Algo salió mal. Inténtalo de nuevo.');
      return undefined;
    } finally {
      await spinner.dismiss();
    }
  }

  private async fail(message: string) {
    const alert = await this.alerts.create({ cssClass: 'app-alert', header: 'No se pudo', message, buttons: ['Entendido'] });
    await alert.present();
  }
}
