import { Component, input } from '@angular/core';

/**
 * Logo de la app. Es provisional (el gato del ícono): cuando haya logo definitivo, se cambia solo aquí y la
 * bienvenida y el recorrido lo toman sin tocar sus animaciones.
 */
@Component({
  selector: 'app-logo',
  template: `<img src="assets/icon/app-cat.png" alt="" [width]="size()" [height]="size()" />`,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      border-radius: 28%;
      background: #ffffff;
      overflow: hidden;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  host: { '[style.width.px]': 'size()', '[style.height.px]': 'size()', 'aria-hidden': 'true' },
})
export class LogoComponent {
  readonly size = input(128);
}
