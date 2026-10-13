import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { DateFieldComponent } from '../select/date-field.component';
import { AlertController, IonContent, IonIcon, IonInput, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { Debt, DebtDirection, installment } from '../../domain/debts';
import { CurrencyState } from '../currency-state';
import { amountToInput, formatMoney, parseAmount, todayIso } from '../format';
import { SuccessCheckComponent } from '../success-check.component';
import { t, errorText } from '../i18n';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-deuda-modal',
  templateUrl: 'deuda.modal.html',
  styleUrls: ['deuda.modal.scss'],
  imports: [DateFieldComponent, IonContent, IonIcon, IonInput, SuccessCheckComponent],
})
export class DeudaModalComponent implements OnInit {
  protected readonly t = t;
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);

  /** Si llega, el formulario edita esta deuda en vez de crear una. */
  @Input() debt?: Debt;
  /** Nombre con que empieza una deuda nueva (desde un pago fijo). */
  @Input() presetName?: string;
  /** En las preguntas iniciales: no guarda, devuelve lo escrito (role 'draft') para guardarlo todo al final. */
  @Input() draft = false;

  protected readonly direction = signal<DebtDirection>('debo');
  protected readonly name = signal('');
  protected readonly principal = signal('');
  protected readonly rate = signal('');
  protected readonly term = signal('');
  protected readonly startDate = signal(todayIso());
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly isEdit = signal(false);

  private readonly termMonths = computed(() => (this.term().trim() ? Number(this.term()) : null));
  private readonly annualRate = computed(() => (this.rate().trim() ? Number(this.rate()) : 0));

  /** Vista previa de la cuota mientras se llena el formulario. */
  protected readonly preview = computed(() => {
    const principal = parseAmount(this.principal());
    const term = this.termMonths();
    const rate = this.annualRate();
    if (!principal || !term || !Number.isInteger(term) || term < 1 || !(rate >= 0)) return '';
    return t('deuda.installment', { amount: formatMoney(installment(principal, rate, term)) });
  });

  protected readonly canSave = computed(
    () => this.name().trim() !== '' && parseAmount(this.principal()) !== null && !this.saving(),
  );

  constructor() {
    addIcons({ close });
  }

  ngOnInit() {
    const d = this.debt;
    if (!d) {
      if (this.presetName) this.name.set(this.presetName);
      return;
    }
    this.isEdit.set(true);
    this.direction.set(d.direction);
    this.name.set(d.name);
    this.principal.set(amountToInput(d.principal));
    this.rate.set(d.annualRate ? String(d.annualRate) : '');
    this.term.set(d.termMonths ? String(d.termMonths) : '');
    this.startDate.set(d.startDate);
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    const fields = {
      name: this.name(),
      direction: this.direction(),
      principal: parseAmount(this.principal()) ?? 0,
      annualRate: this.annualRate(),
      termMonths: this.termMonths(),
      startDate: this.startDate(),
    };
    if (this.draft) {
      await this.modalCtrl.dismiss(fields, 'draft');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.saveDebt.execute(fields, this.debt?.id);
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(errorText(e, 'common.saveFailed'));
      this.saving.set(false);
    }
  }

  protected async confirmDelete() {
    const debt = this.debt;
    if (!debt) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: t('deuda.delete'),
      message: t('deuda.deleteMsg', { name: debt.name }),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        { text: t('common.delete'), role: 'destructive' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'destructive') return;
    this.saving.set(true);
    try {
      await this.container.deleteDebt.execute(debt.id);
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (err) {
      console.error(err);
      this.error.set(t('common.deleteFailed'));
      this.saving.set(false);
    }
  }
}
