import { Component, computed, input, model, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown } from 'ionicons/icons';
import { t } from './i18n';

/** El 31 significa "último día del mes": en meses cortos cae el 28, 29 o 30. */
export const LAST_DAY = 31;

export const dayLabel = (day: number | null) =>
  day === null ? t('fields.chooseDay') : day === LAST_DAY ? t('fields.lastDay') : t('fields.dayN', { n: day });

/**
 * Elegir un día del mes sin escribir: un botón que abre una cuadrícula 1–30 + "Último día".
 * Un toque elige y cierra.
 */
@Component({
  selector: 'app-day-picker',
  template: `
    <button
      type="button"
      class="trigger"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label() + ': ' + text()"
      (click)="open.set(!open())"
    >
      <span class="trigger-text">
        <span class="label">{{ label() }}</span>
        <span class="value" [class.placeholder]="value() === null">{{ text() }}</span>
      </span>
      <ion-icon name="chevron-down" aria-hidden="true" [class.flipped]="open()"></ion-icon>
    </button>
    @if (open()) {
      <div class="grid" role="listbox" [attr.aria-label]="label()">
        @for (d of days; track d) {
          <button
            type="button"
            role="option"
            class="day"
            [attr.aria-selected]="value() === d"
            [attr.aria-label]="t('fields.dayN', { n: d })"
            (click)="pick(d)"
          >
            {{ d }}
          </button>
        }
        <button type="button" role="option" class="day last" [attr.aria-selected]="value() === lastDay" (click)="pick(lastDay)">
          {{ t('fields.lastDay') }}
        </button>
      </div>
    }
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
    .trigger-text {
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
      color: var(--muted-on-light);
      transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
    }
    ion-icon.flipped {
      transform: rotate(180deg);
    }
    /* Se abre como el menú desplegable de design.md 10.4: crece desde arriba con un desvanecido corto. */
    .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      padding: 4px 0 12px;
      transform-origin: top center;
      animation: t-grid-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .day {
      min-height: 48px;
      border: 0;
      border-radius: 12px;
      background: var(--surface-soft-chip);
      color: var(--text-on-light);
      font: inherit;
      font-size: 15px;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
    }
    .day:active {
      transform: scale(0.94);
    }
    .day[aria-selected='true'] {
      background: var(--violet-600);
      color: #fff;
      font-weight: 600;
    }
    .day:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 1px;
    }
    .day.last {
      grid-column: span 5;
    }
    @keyframes t-grid-in {
      from {
        opacity: 0;
        transform: scaleY(0.92) translateY(-4px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .grid,
      ion-icon {
        animation: none;
        transition: none;
      }
    }
  `,
  imports: [IonIcon],
})
export class DayPickerComponent {
  protected readonly t = t;
  readonly label = input(t('fields.dayOfMonth'));
  readonly value = model<number | null>(null);

  protected readonly open = signal(false);
  protected readonly days = Array.from({ length: 30 }, (_, i) => i + 1);
  protected readonly lastDay = LAST_DAY;
  protected readonly text = computed(() => dayLabel(this.value()));

  constructor() {
    addIcons({ chevronDown });
  }

  protected pick(day: number) {
    this.value.set(day);
    this.open.set(false);
  }
}
