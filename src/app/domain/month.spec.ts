import { daysBetween } from './month';

describe('daysBetween', () => {
  it('cuenta días de calendario, también entre meses y años', () => {
    expect(daysBetween('2026-10-05', '2026-10-08')).toBe(3);
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('es negativo si la segunda fecha es anterior y cero si son iguales', () => {
    expect(daysBetween('2026-10-08', '2026-10-05')).toBe(-3);
    expect(daysBetween('2026-10-05', '2026-10-05')).toBe(0);
  });
});
