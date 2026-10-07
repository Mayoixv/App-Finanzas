import { Component, inject, Input } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, checkmark } from 'ionicons/icons';
import { SelectOption } from './select-field.component';

/**
 * Hoja inferior para elegir una opción: un toque elige y cierra, sin botón OK.
 * Devuelve la opción elegida (role 'select') o pide la acción extra (role 'action').
 */
@Component({
  selector: 'app-select-sheet',
  template: `
      <div class="picker">
        <div class="grab" aria-hidden="true"></div>
        <h2 class="picker-title" id="picker-title">{{ title }}</h2>
        <ul class="options" role="listbox" aria-labelledby="picker-title">
          @for (o of options; track $index; let i = $index) {
            <li class="opt" [style.--i]="i">
              <button type="button" role="option" class="option" [attr.aria-selected]="o.value === value" (click)="pick(o)">
                @if (o.icon) {
                  <span class="dot" [style.background]="o.color" aria-hidden="true"><ion-icon [name]="o.icon"></ion-icon></span>
                }
                <span class="option-label">{{ o.label }}</span>
                @if (o.value === value) {
                  <ion-icon class="check" name="checkmark" aria-hidden="true"></ion-icon>
                }
              </button>
            </li>
          }
        </ul>
        @if (action) {
          <button type="button" class="option action" (click)="runAction()">
            <span class="dot plus" aria-hidden="true"><ion-icon name="add"></ion-icon></span>
            <span class="option-label">{{ action }}</span>
          </button>
        }
      </div>
  `,
  styles: `
    .picker {
      display: flex;
      flex-direction: column;
      max-height: 80vh;
      background: var(--paper);
      padding: 8px 12px calc(var(--ion-safe-area-bottom, 0px) + 16px);
    }
    .grab {
      flex: none;
      width: 40px;
      height: 4px;
      margin: 4px auto 12px;
      border-radius: 2px;
      background: rgba(20, 18, 31, 0.18);
    }
    .picker-title {
      margin: 0 12px 8px;
      font-size: 17px;
      font-weight: 600;
      color: var(--text-on-light);
    }
    .options {
      margin: 0;
      padding: 0;
      list-style: none;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .option {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      min-height: 56px;
      padding: 8px 12px;
      border: 0;
      border-radius: var(--radius-field);
      background: transparent;
      color: var(--text-on-light);
      font: inherit;
      font-size: 16px;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.12s ease;
    }
    .option:active {
      transform: scale(0.98);
    }
    .option[aria-selected='true'] {
      background: var(--surface-soft-card);
      font-weight: 600;
    }
    .option:focus-visible {
      outline: 3px solid var(--violet-600);
      outline-offset: -3px;
    }
    .option-label {
      flex: 1;
    }
    .dot {
      flex: none;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      color: #fff;
      font-size: 18px;
    }
    .dot.plus {
      background: var(--surface-soft-card);
      color: var(--violet-600);
    }
    .check {
      color: var(--violet-600);
      font-size: 22px;
      animation: t-check-pop 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .action {
      flex: none;
      margin-top: 4px;
      border-top: 1px solid rgba(20, 18, 31, 0.08);
      border-radius: 0 0 var(--radius-field) var(--radius-field);
      color: var(--violet-600);
      font-weight: 600;
    }
    /* Las filas entran en cascada mientras sube la hoja (solo las primeras, para no hacer esperar). */
    .opt {
      animation: t-opt-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-delay: calc(min(var(--i), 8) * 25ms + 60ms);
    }
    @keyframes t-opt-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
    @keyframes t-check-pop {
      from {
        transform: scale(0.4);
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .opt,
      .check {
        animation: none;
      }
    }
  `,
  imports: [IonIcon],
})
export class SelectSheetComponent<T> {
  private readonly modalCtrl = inject(ModalController);

  @Input() title = '';
  @Input() options: SelectOption<T>[] = [];
  @Input() value: T | null = null;
  @Input() action?: string;

  constructor() {
    addIcons({ add, checkmark });
  }

  protected pick(o: SelectOption<T>) {
    return this.modalCtrl.dismiss(o.value, 'select');
  }

  protected runAction() {
    return this.modalCtrl.dismiss(null, 'action');
  }
}
