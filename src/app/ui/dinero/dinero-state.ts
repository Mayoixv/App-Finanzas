import { Injectable, signal } from '@angular/core';

export type DineroSection = 'cuentas' | 'tarjetas' | 'metas' | 'deudas';
export const DINERO_SECTIONS: DineroSection[] = ['cuentas', 'tarjetas', 'metas', 'deudas'];

/** Sección visible de la pestaña Dinero; el botón + agrega lo que corresponde a ella. */
@Injectable({ providedIn: 'root' })
export class DineroState {
  readonly section = signal<DineroSection>('cuentas');
}
