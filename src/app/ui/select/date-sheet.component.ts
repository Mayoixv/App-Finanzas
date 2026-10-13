import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward } from 'ionicons/icons';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
export function todayIso(): string {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
}

/**
 * Calendario de un mes en una hoja inferior: un toque en el día elige y cierra.
 * Devuelve la fecha 'AAAA-MM-DD' (role 'select') o '' si se quita (role 'clear').
 */
@Component({
  selector: 'app-date-sheet',
  template: `
    <div class="picker">
      <div class="grab" aria-hidden="true"></div>
      <div class="head">
        <button type="button" class="nav" aria-label="Mes anterior" (click)="move(-1)">
          <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
        </button>
        <h2 class="month" aria-live="polite">{{ monthLabel() }}</h2>
        <button type="button" class="nav" aria-label="Mes siguiente" (click)="move(1)">
          <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
        </button>
      </div>
      <div class="grid weekdays" aria-hidden="true">
        @for (w of weekdays; track $index) {
          <span>{{ w }}</span>
        }
      </div>
      @for (m of [view()]; track m.y * 12 + m.m) {
        <div class="grid days" role="grid" [attr.aria-label]="monthLabel()">
          @for (cell of cells(); track $index) {
            @if (cell) {
              <button
                type="button"
                class="day"
                [class.today]="cell.iso === today"
                [attr.aria-selected]="cell.iso === value"
                [attr.aria-label]="cell.d + ' de ' + monthName()"
                (click)="pick(cell.iso)"
              >
                <span class="num">{{ cell.d }}</span>
              </button>
            } @else {
              <span></span>
            }
          }
        </div>
      }
      <div class="actions">
        <button type="button" class="btn-secondary" (click)="pick(today)">Hoy</button>
        @if (optional) {
          <button type="button" class="clear" (click)="clear()">Sin fecha</button>
        }
      </div>
    </div>
  `,
  styles: `
    .picker {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--paper);
      padding: 8px 16px calc(var(--ion-safe-area-bottom, 0px) + 16px);
    }
    .grab {
      width: 40px;
      height: 4px;
      margin: 4px auto 4px;
      border-radius: 2px;
      background: var(--line-axis);
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .month {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      color: var(--text-on-light);
    }
    .nav {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border: 0;
      border-radius: 50%;
      background: var(--surface-soft-card);
      color: var(--text-on-light);
      font-size: 20px;
      cursor: pointer;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0;
    }
    .weekdays span {
      text-align: center;
      font-size: 15px;
      color: var(--muted-on-light);
    }
    .days {
      animation: t-cal-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    /* El botón ocupa toda la columna (zona táctil); el círculo va dentro. */
    .day {
      display: grid;
      place-items: center;
      height: 48px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--text-on-light);
      font: inherit;
      font-size: 16px;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
    }
    .num {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      transition: background-color 0.15s ease, transform 0.12s ease;
    }
    .day:active .num {
      transform: scale(0.92);
    }
    .day.today .num {
      box-shadow: inset 0 0 0 1.5px var(--accent);
    }
    .day[aria-selected='true'] .num {
      background: var(--violet-600);
      color: #fff;
      font-weight: 600;
    }
    .nav:focus-visible,
    .day:focus-visible,
    .clear:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 1px;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    .actions .btn-secondary {
      flex: 1;
      border-color: var(--accent);
      color: var(--accent);
    }
    .clear {
      flex: 1;
      min-height: 48px;
      border: 0;
      background: transparent;
      color: var(--muted-on-light);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    @keyframes t-cal-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .days {
        animation: none;
      }
    }
  `,
  imports: [IonIcon],
})
export class DateSheetComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);

  @Input() value = '';
  @Input() optional = false;

  protected readonly weekdays = WEEKDAYS;
  protected readonly today = todayIso();
  protected readonly view = signal({ y: 0, m: 0 });
  protected readonly monthName = computed(() => MONTHS[this.view().m]);
  protected readonly monthLabel = computed(() => {
    const name = this.monthName();
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${this.view().y}`;
  });

  /** Huecos vacíos hasta el día de la semana del 1 (lunes primero) y luego los días del mes. */
  protected readonly cells = computed(() => {
    const { y, m } = this.view();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: days }, (_, i) => ({ d: i + 1, iso: iso(y, m, i + 1) })),
    ];
  });

  constructor() {
    addIcons({ chevronBack, chevronForward });
  }

  ngOnInit() {
    const [y, m] = (/^\d{4}-\d{2}-\d{2}$/.test(this.value) ? this.value : this.today).split('-').map(Number);
    this.view.set({ y, m: m - 1 });
  }

  protected move(step: number) {
    const { y, m } = this.view();
    const next = new Date(y, m + step, 1);
    this.view.set({ y: next.getFullYear(), m: next.getMonth() });
  }

  protected pick(date: string) {
    return this.modalCtrl.dismiss(date, 'select');
  }

  protected clear() {
    return this.modalCtrl.dismiss('', 'clear');
  }
}
