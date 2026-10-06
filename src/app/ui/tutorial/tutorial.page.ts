import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { TutorialComponent } from './tutorial.component';

/** El recorrido de la app, para volver a verlo desde Ajustes. */
@Component({
  selector: 'app-tutorial-page',
  template: `
    <ion-content class="surface-light" [fullscreen]="true">
      <div class="wrap">
        <app-tutorial (finished)="close()"></app-tutorial>
      </div>
    </ion-content>
  `,
  styles: `
    .wrap {
      max-width: 480px;
      margin: 0 auto;
      padding: calc(var(--ion-safe-area-top, 0px) + 24px) 20px calc(var(--ion-safe-area-bottom, 0px) + 32px);
    }
  `,
  imports: [IonContent, TutorialComponent],
})
export class TutorialPage {
  private readonly location = inject(Location);

  protected close() {
    this.location.back();
  }
}
