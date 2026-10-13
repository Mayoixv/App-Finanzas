import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { SelectFieldComponent } from '../select/select-field.component';
import { AlertController, IonIcon, IonToggle, LoadingController } from '@ionic/angular';
import { applyPrivacy, isPrivacyOn, privacyAvailable, setPrivacy } from '../privacy';
import { NotificationsService } from '../notifications.service';
import { AutoBackupService } from '../auto-backup.service';
import { CloudBackupService } from '../cloud/cloud-backup.service';
import { formatDay } from '../format';
import { addIcons } from 'ionicons';
import { chevronForward } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { ValidationError } from '../../application/errors';
import { WIPE_CONFIRMATION } from '../../application/use-cases/backup';
import { fileDate, pickTextFile, saveFile } from '../file-io';
import { monthLabel } from '../format';
import { LockState } from '../lock/lock-state';

type Values = Record<string, string>;

/** Secciones "Tus datos" (respaldo, restauración, CSV) y "Bloqueo con PIN" de Ajustes. */
@Component({
  selector: 'app-datos',
  templateUrl: 'datos.component.html',
  styleUrls: ['datos.component.scss'],
  imports: [SelectFieldComponent, IonIcon, IonToggle],
})
export class DatosComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly alerts = inject(AlertController);
  private readonly loading = inject(LoadingController);
  protected readonly lock = inject(LockState);
  private readonly notifications = inject(NotificationsService);
  protected readonly autoBackup = inject(AutoBackupService);
  protected readonly cloud = inject(CloudBackupService);
  private readonly autoToggle = viewChild<IonToggle>('autoToggle');
  protected readonly autoBackupDetail = computed(() => {
    if (!this.autoBackup.available) return 'Disponible en la app del teléfono';
    if (!this.autoBackup.enabled()) return 'Cada 7 días, cifrado, en Documentos/Kuarto del teléfono';
    if (this.autoBackup.lastError()) return 'No se pudo guardar el último; se reintenta al abrir la app';
    const last = this.autoBackup.lastRun();
    return last ? `Último: ${formatDay(last)} · Documentos/Kuarto` : 'Pendiente; se hace al abrir la app';
  });
  protected readonly lockOptions = [
    { value: 0, label: 'Al momento' },
    { value: 60, label: 'Tras 1 minuto' },
    { value: 300, label: 'Tras 5 minutos' },
    { value: 900, label: 'Tras 15 minutos' },
  ];

  protected readonly pinEnabled = signal(false);
  protected readonly privacy = signal(false);
  protected readonly privacyAvailable = privacyAvailable;
  private readonly privacyToggle = viewChild<IonToggle>('privacyToggle');
  private readonly bioToggle = viewChild<IonToggle>('bioToggle');
  protected readonly biometryAvailable = signal(false);
  protected readonly status = signal('');

  constructor() {
    addIcons({ chevronForward });
  }

  async ngOnInit() {
    this.pinEnabled.set(await this.container.pinLock.isEnabled());
    this.privacy.set(await isPrivacyOn(this.container.settings));
    if (this.autoBackup.available) await this.autoBackup.refresh();
    this.biometryAvailable.set(await this.lock.biometryAvailable().catch(() => false));
  }

  /** Devuelve true si el respaldo se creó y se entregó para guardar. */
  protected async createBackup(): Promise<boolean> {
    const values = await this.ask(
      'Crear respaldo',
      'Elige una contraseña para cifrar el respaldo. Si la olvidas, el respaldo no se puede abrir.',
      [
        { name: 'p1', type: 'password', placeholder: 'Contraseña (mínimo 6)', attributes: { autocomplete: 'new-password' } },
        { name: 'p2', type: 'password', placeholder: 'Repite la contraseña', attributes: { autocomplete: 'new-password' } },
      ],
      'Crear',
    );
    if (!values) return false;
    if (values['p1'] !== values['p2']) {
      await this.fail('Las contraseñas no coinciden.');
      return false;
    }
    const done = await this.busy('Cifrando respaldo…', async () => {
      const file = await this.container.createBackup.execute(values['p1']);
      const where = await saveFile(`kuarto-respaldo-${fileDate()}.finanzas`, file, 'application/json');
      this.status.set(where ? `Respaldo guardado en ${where}. Copia también ese archivo fuera del teléfono (Drive, correo).` : 'Respaldo descargado.');
      return true;
    });
    return done === true;
  }

  protected async wipeAll() {
    const warning = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Borrar todos los datos',
      message:
        'Se borran tus movimientos, fijos, metas, presupuestos, deudas y ajustes, incluido el PIN. No se puede deshacer. Conviene crear un respaldo antes.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Seguir sin respaldo', role: 'continue' },
        { text: 'Crear respaldo', role: 'backup' },
      ],
    });
    await warning.present();
    const { role } = await warning.onDidDismiss();
    if (role === 'backup') {
      if (!(await this.createBackup())) return;
    } else if (role !== 'continue') {
      return;
    }

    const values = await this.ask(
      'Confirmar borrado',
      `Escribe ${WIPE_CONFIRMATION} para borrar todo.`,
      [{ name: 'w', type: 'text', placeholder: WIPE_CONFIRMATION, attributes: { autocapitalize: 'characters', autocomplete: 'off' } }],
      'Borrar todo',
    );
    if (!values) return;
    const done = await this.busy('Borrando…', async () => {
      await this.container.wipeAllData.execute(values['w']);
      // Ya sin datos: que no quede ningún aviso programado ni la pantalla protegida.
      if (this.notifications.available) await this.notifications.disable();
      await applyPrivacy(false);
      return true;
    });
    // La app arranca de cero: bienvenida, sin PIN.
    if (done) location.replace('/');
  }

  protected async restoreBackup() {
    const text = await pickTextFile();
    if (text) await this.restoreFromText(text);
  }

  /** Abre un respaldo cifrado (de un archivo o de la nube), muestra qué trae y, si se confirma, reemplaza los datos. */
  private async restoreFromText(text: string) {
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
      const where = await saveFile(`kuarto-movimientos-${fileDate()}.csv`, csv, 'text/csv');
      this.status.set(`Exportados ${rows} movimientos${where ? ` a ${where}` : ''}.`);
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
    if (this.lock.biometricOn()) await this.lock.setBiometric(false);
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

  protected async setLockAfter(seconds: number) {
    try {
      await this.lock.setLockAfter(seconds);
      this.status.set('Tiempo de bloqueo guardado.');
    } catch (e) {
      console.error(e);
      this.status.set('No se pudo guardar el tiempo de bloqueo.');
    }
  }

  protected async togglePrivacy(on: boolean) {
    if (on === this.privacy()) return;
    try {
      await setPrivacy(this.container.settings, on);
      this.privacy.set(on);
      this.status.set(on ? 'La app se oculta en recientes y no permite capturas.' : 'La app vuelve a verse en recientes.');
    } catch (e) {
      console.error(e);
      this.status.set('No se pudo cambiar. Inténtalo de nuevo.');
      const toggle = this.privacyToggle();
      if (toggle) toggle.checked = this.privacy();
    }
  }

  protected async toggleBiometric(on: boolean) {
    if (on === this.lock.biometricOn()) return;
    try {
      const ok = await this.lock.setBiometric(on);
      this.status.set(
        !ok ? 'No se confirmó la huella; sigue desactivada.' : on ? 'Desbloqueo con huella activado.' : 'Desbloqueo con huella desactivado.',
      );
    } catch (e) {
      console.error(e);
      this.status.set('No se pudo cambiar. Inténtalo de nuevo.');
    } finally {
      const toggle = this.bioToggle();
      if (toggle) toggle.checked = this.lock.biometricOn();
    }
  }

  /** Entra con Google. La nube guarda el respaldo semanal, así que primero tiene que estar activado. */
  protected async cloudSignIn() {
    if (!this.autoBackup.enabled()) {
      await this.toggleAutoBackup(true);
      if (!this.autoBackup.enabled()) return;
    }
    const done = await this.busy('Entrando con Google…', async () => {
      await this.cloud.signIn();
      return true;
    });
    if (done) await this.cloudUpload();
  }

  protected async cloudUpload() {
    const done = await this.busy('Subiendo respaldo cifrado…', async () => {
      await this.cloud.upload(await this.container.autoBackup.create());
      return true;
    });
    if (done) this.status.set('Respaldo subido a la nube, cifrado con la contraseña del respaldo automático.');
  }

  protected async cloudRestore() {
    const list = await this.busy('Buscando respaldos…', () => this.cloud.list());
    if (!list) return;
    if (!list.length) return this.fail('No hay respaldos en la nube con esta cuenta.');
    const alert = await this.alerts.create({
      cssClass: 'app-alert choices',
      header: 'Restaurar desde la nube',
      message: 'Elige el respaldo. Luego te pide la contraseña del respaldo automático con que se creó.',
      buttons: [
        ...list.map((b, i) => ({ text: `${formatDay(b.createdAt.slice(0, 10))}${i === 0 ? ' (el más reciente)' : ''}`, role: b.id })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (!role || role === 'cancel' || role === 'backdrop') return;
    const text = await this.busy('Descargando…', () => this.cloud.download(role));
    if (text) await this.restoreFromText(text);
  }

  protected async cloudSignOut() {
    await this.busy('Saliendo…', async () => {
      await this.cloud.signOut();
      return true;
    });
    this.status.set('Saliste de la cuenta. Los respaldos ya subidos siguen en la nube.');
  }

  protected async toggleAutoBackup(on: boolean) {
    if (on === this.autoBackup.enabled()) return;
    try {
      if (!on) {
        await this.autoBackup.disable();
        this.status.set('Respaldo automático desactivado. Los archivos ya guardados se quedan en Documentos/Kuarto.');
        return;
      }
      const values = await this.ask(
        'Respaldo automático',
        'Elige la contraseña con la que se cifrarán los respaldos semanales. La necesitarás para restaurarlos; si la olvidas, no se pueden abrir.',
        [
          { name: 'p1', type: 'password', placeholder: 'Contraseña (mínimo 6)', attributes: { autocomplete: 'new-password' } },
          { name: 'p2', type: 'password', placeholder: 'Repite la contraseña', attributes: { autocomplete: 'new-password' } },
        ],
        'Activar',
      );
      if (!values) return;
      if (values['p1'] !== values['p2']) return this.fail('Las contraseñas no coinciden.');
      const saved = await this.busy('Creando el primer respaldo…', () => this.autoBackup.enable(values['p1']));
      if (saved === false) await this.fail('Se activó, pero no se pudo guardar el primer respaldo. Se reintenta al abrir la app.');
      else if (saved) this.status.set('Respaldo automático activado. El primero ya está en Documentos/Kuarto.');
    } finally {
      const toggle = this.autoToggle();
      if (toggle) toggle.checked = this.autoBackup.enabled();
    }
  }
}
