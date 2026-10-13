import { Component, computed, inject, input, model } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import { DateSheetComponent } from './date-sheet.component';
import { t, locale } from '../i18n';


/** Campo de fecha con el estilo de la app: abre un calendario propio en vez del nativo de Android. Valor 'AAAA-MM-DD'. */
@Component({
  selector: 'app-date-field',
  template: `
    <button type="button" class="trigger" aria-haspopup="dialog" [attr.aria-label]="label() + ': ' + text()" (click)="openSheet()">
      <span class="text">
        <span class="label">{{ label() }}</span>
        <span class="value" [class.placeholder]="!value()">{{ text() }}</span>
      </span>
      <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .trigger {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 56px;
      padding: 6px 0;
      border: 0;
      background: transparent;
      color: var(--text-on-light);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .trigger:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
      border-radius: 12px;
    }
    .text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .label {
      font-size: 12px;
      color: var(--muted-on-light);
    }
    .value {
      font-size: 16px;
    }
    .value.placeholder {
      color: var(--muted-on-light);
    }
    ion-icon {
      flex: none;
      font-size: 20px;
      color: var(--muted-on-light);
    }
  `,
  imports: [IonIcon],
})
export class DateFieldComponent {
  protected readonly t = t;
  private readonly modals = inject(ModalController);

  readonly label = input(t('fields.date'));
  /** Con `optional`, la hoja ofrece "Sin fecha". */
  readonly optional = input(false);
  readonly placeholder = input(t('fields.chooseDate'));
  readonly value = model('');

  protected readonly text = computed(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.value());
    if (!m) return this.placeholder();
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(date).replace(' de ', ' ');
  });
  private isOpen = false;

  constructor() {
    addIcons({ calendarOutline });
  }

  protected async openSheet() {
    if (this.isOpen) return;
    this.isOpen = true;
    try {
      const sheet = await this.modals.create({
        component: DateSheetComponent,
        componentProps: { value: this.value(), optional: this.optional() },
        cssClass: 'select-modal',
      });
      await sheet.present();
      const { data, role } = await sheet.onWillDismiss<string>();
      if (role === 'select' || role === 'clear') this.value.set(data ?? '');
    } finally {
      this.isOpen = false;
    }
  }
}
