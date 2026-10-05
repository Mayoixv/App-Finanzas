/** Moneda en que se muestran los montos. Cambiarla no convierte nada: solo cambia el símbolo. */
export type Currency = 'DOP' | 'USD';

export const CURRENCIES: readonly Currency[] = ['DOP', 'USD'];

export function isCurrency(value: unknown): value is Currency {
  return value === 'DOP' || value === 'USD';
}
