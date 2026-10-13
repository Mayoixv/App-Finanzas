import { Component, inject, Injectable, input } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { helpCircleOutline } from 'ionicons/icons';
import { helpEntry, HelpTopic } from './help.content';
import { HelpSheetComponent } from './help-sheet.component';
import { t } from '../i18n';

/** Abre la ayuda de una pantalla. Lo usan el botón "?" y Ajustes › Ayuda. */
@Injectable({ providedIn: 'root' })
export class HelpService {
  private readonly modals = inject(ModalController);
  private isOpen = false;

  async open(topic: HelpTopic) {
    // Un doble toque no abre dos hojas.
    if (this.isOpen) return;
    this.isOpen = true;
    try {
      const sheet = await this.modals.create({ component: HelpSheetComponent, componentProps: { topic }, cssClass: 'select-modal' });
      await sheet.present();
      await sheet.onWillDismiss();
    } finally {
      this.isOpen = false;
    }
  }
}

/** Botón "?" del encabezado de cada pantalla. */
@Component({
  selector: 'app-help-button',
  template: `
    <button type="button" class="help" [attr.aria-label]="t('ajustes.helpAbout', { topic: title() })" (click)="help.open(topic())">
      <ion-icon name="help-circle-outline" aria-hidden="true"></ion-icon>
    </button>
  `,
  styles: `
    .help {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      font-size: 26px;
      cursor: pointer;
      transition: transform 0.14s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .help:active {
      transform: scale(0.92);
    }
    .help:focus-visible {
      outline: 3px solid var(--violet-400);
      outline-offset: 2px;
    }
  `,
  imports: [IonIcon],
})
export class HelpButtonComponent {
  protected readonly t = t;
  protected readonly help = inject(HelpService);
  readonly topic = input.required<HelpTopic>();
  protected title() {
    return helpEntry(this.topic()).title;
  }

  constructor() {
    addIcons({ helpCircleOutline });
  }
}
