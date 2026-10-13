import { Component, computed, inject, input, model, output } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown } from 'ionicons/icons';
import { SelectSheetComponent } from './select-sheet.component';
import { t } from '../i18n';

export interface SelectOption<T> {
  value: T;
  label: string;
  /** Con ícono, se dibuja dentro de un círculo de este color. */
  icon?: string;
  color?: string;
}

/**
 * Sustituto de ion-select con el estilo de la app: el campo abre una hoja inferior propia (SelectSheetComponent).
 * `inline`: etiqueta a la izquierda y valor a la derecha, para las filas de Ajustes.
 */
@Component({
  selector: 'app-select-field',
  template: `
    <button
      type="button"
      class="trigger"
      [class.inline]="inline()"
      aria-haspopup="listbox"
      [attr.aria-label]="label() + ': ' + (selected()?.label ?? placeholder())"
      [disabled]="disabled()"
      (click)="openSheet()"
    >
      @if (!inline() && selected()?.icon) {
        <span class="dot" [style.background]="selected()!.color" aria-hidden="true"><ion-icon [name]="selected()!.icon"></ion-icon></span>
      }
      <span class="text">
        <span class="label">{{ label() }}</span>
        <span class="value" [class.placeholder]="!selected()">{{ selected()?.label ?? placeholder() }}</span>
      </span>
      <ion-icon class="chevron" name="chevron-down" aria-hidden="true"></ion-icon>
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
    .trigger:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .trigger:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
      border-radius: 12px;
    }
    .text {
      flex: 1;
      min-width: 0;
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
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .value.placeholder {
      color: var(--muted-on-light);
    }
    .inline .text {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .inline .label {
      font-size: 16px;
      color: var(--text-on-light);
    }
    .inline .value {
      color: var(--muted-on-light);
    }
    .dot {
      flex: none;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #fff;
      font-size: 16px;
    }
    .chevron {
      flex: none;
      color: var(--muted-on-light);
    }
  `,
  imports: [IonIcon],
})
export class SelectFieldComponent<T> {
  private readonly modals = inject(ModalController);

  readonly label = input.required<string>();
  readonly options = input.required<SelectOption<T>[]>();
  readonly placeholder = input(t('fields.chooseOption'));
  /** Título de la hoja; si falta, la etiqueta. */
  readonly title = input<string>();
  /** Texto de una acción extra al final de la hoja (por ejemplo "Nueva categoría"). */
  readonly action = input<string>();
  readonly inline = input(false);
  readonly disabled = input(false);
  readonly value = model<T | null>(null);
  /** Se tocó la acción extra. */
  readonly actionPicked = output<void>();

  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()));
  private isOpen = false;

  constructor() {
    addIcons({ chevronDown });
  }

  protected async openSheet() {
    // Un doble toque no debe abrir dos hojas.
    if (this.isOpen) return;
    this.isOpen = true;
    try {
      const sheet = await this.modals.create({
        component: SelectSheetComponent,
        componentProps: { title: this.title() ?? this.label(), options: this.options(), value: this.value(), action: this.action() },
        cssClass: 'select-modal',
      });
      await sheet.present();
      const { data, role } = await sheet.onWillDismiss<T>();
      if (role === 'select') this.value.set(data as T);
      if (role === 'action') this.actionPicked.emit();
    } finally {
      this.isOpen = false;
    }
  }
}
