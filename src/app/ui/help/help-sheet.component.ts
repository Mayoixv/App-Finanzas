import { Component, inject, Input } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { helpCircle } from 'ionicons/icons';
import { HELP, HelpTopic } from './help.content';

/** Hoja inferior corta con la ayuda de una pantalla. Se cierra al tocar fuera o con "Entendido"; no cambia nada. */
@Component({
  selector: 'app-help-sheet',
  template: `
    <div class="help">
      <div class="grab" aria-hidden="true"></div>
      <h2 class="title" id="help-title">
        <ion-icon name="help-circle" aria-hidden="true"></ion-icon>
        {{ entry.title }}
      </h2>
      <ul class="points" aria-labelledby="help-title">
        @for (p of entry.points; track $index; let i = $index) {
          <li [style.--i]="i">{{ p }}</li>
        }
      </ul>
      <button type="button" class="btn-primary ok" (click)="close()">Entendido</button>
    </div>
  `,
  styles: `
    .help {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 8px 20px calc(var(--ion-safe-area-bottom, 0px) + 20px);
      background: var(--paper);
      color: var(--text-on-light);
    }
    .grab {
      width: 40px;
      height: 4px;
      margin: 4px auto 4px;
      border-radius: 2px;
      background: rgba(20, 18, 31, 0.18);
    }
    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 19px;
      font-weight: 600;
    }
    .title ion-icon {
      color: var(--violet-600);
      font-size: 24px;
    }
    .points {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .points li {
      position: relative;
      padding-left: 20px;
      font-size: 16px;
      line-height: 1.45;
      animation: t-help-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-delay: calc(var(--i) * 50ms + 80ms);
    }
    .points li::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 0.6em;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--violet-600);
    }
    .ok {
      margin-top: 4px;
    }
    @keyframes t-help-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .points li {
        animation: none;
      }
    }
  `,
  imports: [IonIcon],
})
export class HelpSheetComponent {
  private readonly modalCtrl = inject(ModalController);
  @Input() topic: HelpTopic = 'inicio';

  protected get entry() {
    return HELP[this.topic];
  }

  constructor() {
    addIcons({ helpCircle });
  }

  protected close() {
    return this.modalCtrl.dismiss();
  }
}
