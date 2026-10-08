import { Injectable, signal } from '@angular/core';

export type DineroSection = 'cuentas' | 'tarjetas';
export const DINERO_SECTIONS: DineroSection[] = ['cuentas', 'tarjetas'];

/** Sección visible de la pestaña Dinero; el botón + agrega lo que corresponde a ella. */
@Injectable({ providedIn: 'root' })
export class DineroState {
  readonly section = signal<DineroSection>('cuentas');
}
