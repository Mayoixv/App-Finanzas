import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { DateFieldComponent } from '../select/date-field.component';
import { AlertController, IonContent, IonIcon, IonInput, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { SavingsGoal } from '../../domain/savings';
import { CurrencyState } from '../currency-state';
import { amountToInput, parseAmount } from '../format';
import { SuccessCheckComponent } from '../success-check.component';
import { t, errorText } from '../i18n';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;

@Component({
  selector: 'app-meta-modal',
  templateUrl: 'meta.modal.html',
  styleUrls: ['meta.modal.scss'],
  imports: [DateFieldComponent, IonContent, IonIcon, IonInput, SuccessCheckComponent],
})
export class MetaModalComponent implements OnInit {
  protected readonly t = t;
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);

  /** Si llega, el formulario edita esta meta en vez de crear una. */
  @Input() goal?: SavingsGoal;
  /** En las preguntas iniciales: no guarda, devuelve lo escrito (role 'draft') para guardarlo todo al final. */
  @Input() draft = false;

  protected readonly name = signal('');
  protected readonly target = signal('');
  protected readonly targetDate = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly isEdit = signal(false);

  protected readonly canSave = computed(
    () => this.name().trim() !== '' && parseAmount(this.target()) !== null && !this.saving(),
  );

  constructor() {
    addIcons({ close });
  }

  ngOnInit() {
    if (this.goal) {
      this.isEdit.set(true);
      this.name.set(this.goal.name);
      this.target.set(amountToInput(this.goal.targetAmount));
      this.targetDate.set(this.goal.targetDate ?? '');
    }
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    this.saving.set(true);
    this.error.set(null);
    const fields = {
      name: this.name(),
      targetAmount: parseAmount(this.target()) ?? 0,
      targetDate: this.targetDate() || null,
    };
    if (this.draft) {
      await this.modalCtrl.dismiss(fields, 'draft');
      return;
    }
    try {
      if (this.goal) await this.container.updateSavingsGoal.execute(this.goal.id, fields);
      else await this.container.addSavingsGoal.execute(fields);
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(
        errorText(e, 'common.saveFailed'),
      );
      this.saving.set(false);
    }
  }

  protected async confirmDelete() {
    const goal = this.goal;
    if (!goal) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: t('meta.delete'),
      message: t('meta.deleteMsg', { name: goal.name }),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        { text: t('common.delete'), role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.container.deleteSavingsGoal.execute(goal.id);
      await this.modalCtrl.dismiss(null, 'deleted');
    } catch (err) {
      console.error(err);
      this.error.set(t('common.deleteFailed'));
      this.saving.set(false);
    }
  }
}
