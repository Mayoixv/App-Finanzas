import { dueDateAfter, lastCutDate } from './account';

describe('ciclo de tarjeta', () => {
  it('el último corte es este mes si ya pasó, si no el del mes anterior', () => {
    expect(lastCutDate(15, '2026-10-20')).toBe('2026-10-15');
    expect(lastCutDate(15, '2026-10-15')).toBe('2026-10-15');
    expect(lastCutDate(15, '2026-10-14')).toBe('2026-09-15');
    // Corte el 31: en febrero es el 28; en enero, antes del 31, el de diciembre.
    expect(lastCutDate(31, '2027-03-01')).toBe('2027-02-28');
    expect(lastCutDate(31, '2027-01-10')).toBe('2026-12-31');
  });

  it('la fecha de pago es el primer día de pago después del corte', () => {
    expect(dueDateAfter('2026-10-15', 5)).toBe('2026-11-05');
    expect(dueDateAfter('2026-10-05', 25)).toBe('2026-10-25');
    expect(dueDateAfter('2026-10-15', 15)).toBe('2026-11-15');
    expect(dueDateAfter('2027-01-31', 30)).toBe('2027-02-28');
  });
});
