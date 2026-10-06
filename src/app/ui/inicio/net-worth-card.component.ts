import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { NetWorth } from '../../application/use-cases/accounts';
import { DineroState } from '../dinero/dinero-state';
import { formatMoney } from '../format';
import { MonthState } from '../month-state';

/** Patrimonio en Inicio: una línea que lleva a la pestaña Dinero. */
@Component({
  selector: 'app-net-worth-card',
  template: `
    @if (net(); as n) {
      <button type="button" class="card" [attr.aria-label]="'Patrimonio ' + money(n.total) + '. Ver cuentas'" (click)="open()">
        <span class="text">
          <span class="label">Patrimonio</span>
          <span class="amount" [class.negative]="n.total < 0">{{ money(n.total) }}</span>
          <span class="sub">Tienes {{ money(n.have) }} · Debes {{ money(n.owe) }}</span>
        </span>
        <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
      </button>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      display: flex;
      align-items: center;
      gap: 12px;
      width: calc(100% - 40px);
      margin: 0 20px 24px;
      padding: 18px 20px;
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-card);
      background: var(--ink-800);
      color: var(--text-on-dark);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .card:focus-visible {
      outline: 3px solid var(--violet-400);
      outline-offset: 2px;
    }
    .text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .label,
    .sub {
      font-size: 14px;
      color: var(--muted);
    }
    .amount {
      font-size: 22px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .amount.negative {
      color: var(--negative);
    }
    ion-icon {
      flex: none;
      color: var(--muted);
    }
  `,
  imports: [IonIcon],
})
export class NetWorthCardComponent {
  private readonly container = inject(APP_CONTAINER);
  private readonly router = inject(Router);
  private readonly monthState = inject(MonthState);
  private readonly dinero = inject(DineroState);

  protected readonly net = signal<NetWorth | null>(null);
  protected readonly money = formatMoney;

  constructor() {
    addIcons({ chevronForward });
    effect(() => {
      this.monthState.version();
      this.container.getNetWorth.execute().then(
        (n) => this.net.set(n),
        (e) => console.error(e),
      );
    });
  }

  protected open() {
    this.dinero.section.set('cuentas');
    this.router.navigateByUrl('/tabs/dinero');
  }
}
