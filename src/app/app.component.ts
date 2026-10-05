import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { LockScreenComponent } from './ui/lock/lock-screen.component';
import { LockState } from './ui/lock/lock-state';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, LockScreenComponent],
})
export class AppComponent {
  protected readonly lock = inject(LockState);
}
