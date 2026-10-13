import { Component, input } from '@angular/core';
import { t } from './i18n';

/**
 * Indicador de carga. Aparece solo si la espera pasa de 0.3 s (un retraso en CSS), para no parpadear en cargas
 * rápidas. Lleva texto para lectores de pantalla.
 */
@Component({
  selector: 'app-loading',
  template: `
    @if (show()) {
      <div class="loading" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <span class="sr-only">{{ t('fields.loading') }}</span>
      </div>
    }
  `,
  styles: `
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px 0;
      opacity: 0;
      animation: t-loading-show 0.2s ease 0.3s forwards;
    }
    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(var(--violet-400-rgb), 0.25);
      border-top-color: var(--violet-600);
      border-radius: 50%;
      animation: t-spin 0.8s linear infinite;
    }
    @keyframes t-loading-show {
      to {
        opacity: 1;
      }
    }
    @keyframes t-spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation-duration: 2.4s;
      }
    }
  `,
})
export class LoadingComponent {
  protected readonly t = t;
  readonly show = input(false);
}
