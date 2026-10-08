import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward, receiptOutline } from 'ionicons/icons';
import { BankNotificationsService } from './bank-notifications.service';

/** Aviso en Inicio y Movimientos cuando hay compras del banco esperando confirmación. */
@Component({
  selector: 'app-pending-banner',
  template: `
    @if (bank.pending(); as n) {
      <a routerLink="/por-confirmar" class="banner" [attr.aria-label]="label(n) + '. Revisar'">
        <span class="icon" aria-hidden="true"><ion-icon name="receipt-outline"></ion-icon></span>
        <span class="text">{{ label(n) }}</span>
        <ion-icon class="chevron" name="chevron-forward" aria-hidden="true"></ion-icon>
      </a>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .banner {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 56px;
      padding: 8px 16px;
      border-radius: var(--radius-card);
      border: 1px solid var(--border-glow);
      background: color-mix(in srgb, var(--violet-600) 18%, transparent);
      color: inherit;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      animation: t-banner-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
      transition: transform 0.14s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .banner:active {
      transform: scale(0.98);
    }
    .banner:focus-visible {
      outline: 3px solid var(--violet-400);
      outline-offset: 2px;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--violet-600);
      color: #fff;
      font-size: 18px;
    }
    .text {
      flex: 1;
    }
    .chevron {
      opacity: 0.7;
    }
    @keyframes t-banner-in {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .banner {
        animation: none;
      }
    }
  `,
  imports: [RouterLink, IonIcon],
})
export class PendingBannerComponent {
  protected readonly bank = inject(BankNotificationsService);

  constructor() {
    addIcons({ chevronForward, receiptOutline });
  }

  protected label(n: number) {
    return n === 1 ? '1 compra del banco por confirmar' : `${n} compras del banco por confirmar`;
  }
}
