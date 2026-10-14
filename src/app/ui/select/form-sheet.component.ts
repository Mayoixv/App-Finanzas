import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { IonIcon, IonInput, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { t } from '../i18n';

export interface FormSheetField {
  name: string;
  type: 'text' | 'password';
  placeholder: string;
  /** Solo números (PIN): abre el teclado numérico. */
  numeric?: boolean;
  maxlength?: number;
  autocomplete?: string;
  autocapitalize?: string;
}

/**
 * Hoja inferior con uno o dos campos y un botón para confirmar (contraseñas, PIN, palabra de confirmación).
 * Las contraseñas llevan un ojo para verlas mientras se escriben. Devuelve los valores (role 'confirm').
 */
@Component({
  selector: 'app-form-sheet',
  template: `
    <form class="sheet-form" (submit)="$event.preventDefault(); confirm()">
      <div class="grab" aria-hidden="true"></div>
      <h2 class="title" id="form-title">{{ header }}</h2>
      @if (message) {
        <p class="message">{{ message }}</p>
      }
      @for (f of fields; track f.name; let first = $first) {
        <div class="field" [class.with-eye]="f.type === 'password'">
          <ion-input
            [label]="f.placeholder"
            label-placement="floating"
            [type]="f.type === 'password' && !shown().has(f.name) ? 'password' : 'text'"
            [inputmode]="f.numeric ? 'numeric' : 'text'"
            [maxlength]="f.maxlength ?? null"
            [autocomplete]="$any(f.autocomplete ?? 'off')"
            [autocapitalize]="f.autocapitalize ?? 'off'"
            [autofocus]="first"
            [value]="values()[f.name] ?? ''"
            (ionInput)="set(f.name, $event.detail.value ?? '')"
          ></ion-input>
          @if (f.type === 'password') {
            <button
              type="button"
              class="eye"
              [attr.aria-pressed]="shown().has(f.name)"
              [attr.aria-label]="shown().has(f.name) ? t('fields.hidePassword') : t('fields.showPassword')"
              (click)="toggle(f.name)"
            >
              <ion-icon [name]="shown().has(f.name) ? 'eye-off-outline' : 'eye-outline'" aria-hidden="true"></ion-icon>
            </button>
          }
        </div>
      }
      <div class="actions">
        <button type="button" class="btn-secondary" (click)="cancel()">{{ t('common.cancel') }}</button>
        <button type="submit" class="btn-primary">{{ okText }}</button>
      </div>
    </form>
  `,
  styles: `
    .sheet-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 85vh;
      overflow-y: auto;
      background: var(--paper);
      padding: 8px 20px calc(var(--ion-safe-area-bottom, 0px) + 20px);
    }
    .grab {
      flex: none;
      width: 40px;
      height: 4px;
      margin: 4px auto 4px;
      border-radius: 2px;
      background: var(--line-axis);
    }
    .title {
      margin: 0;
      font-size: 19px;
      font-weight: 600;
      color: var(--text-on-light);
    }
    .message {
      margin: 0;
      font-size: 15px;
      line-height: 1.5;
      color: var(--muted-on-light);
    }
    .field {
      position: relative;
      min-height: 60px;
      padding: 0 16px;
      border: 1.5px solid transparent;
      border-radius: var(--radius-field);
      background: var(--surface-soft-chip);
      --color: var(--text-on-light);
      --placeholder-color: var(--muted-on-light);
    }
    .field:focus-within {
      border-color: var(--accent);
    }
    .field.with-eye {
      padding-right: 56px;
    }
    .eye {
      position: absolute;
      top: 50%;
      right: 4px;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-top: -24px;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--muted-on-light);
      font-size: 22px;
      cursor: pointer;
    }
    .eye[aria-pressed='true'] {
      color: var(--accent);
    }
    .eye:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: -3px;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }
    .actions button {
      flex: 1;
    }
  `,
  imports: [IonIcon, IonInput],
})
export class FormSheetComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  protected readonly t = t;

  @Input() header = '';
  @Input() message = '';
  @Input() fields: FormSheetField[] = [];
  @Input() okText = '';

  protected readonly values = signal<Record<string, string>>({});
  /** Contraseñas que se están mostrando. */
  protected readonly shown = signal<ReadonlySet<string>>(new Set());

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  ngOnInit() {
    this.values.set(Object.fromEntries(this.fields.map((f) => [f.name, ''])));
  }

  protected set(name: string, value: string) {
    this.values.update((v) => ({ ...v, [name]: value }));
  }

  protected toggle(name: string) {
    this.shown.update((set) => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected confirm() {
    return this.modalCtrl.dismiss(this.values(), 'confirm');
  }
}
