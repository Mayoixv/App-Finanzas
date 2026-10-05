/**
 * Todos los montos del dominio son centavos enteros (RD$12.50 se guarda como 1250).
 * Así las sumas y comparaciones son exactas: con decimales, 0.1 + 0.2 no es igual a 0.3.
 */
export type Cents = number;

export function isValidCents(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
