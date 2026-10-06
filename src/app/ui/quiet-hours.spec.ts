import { deferPastQuiet, inQuiet } from './quiet-hours';

describe('horas de silencio', () => {
  it('reconoce rangos que cruzan la medianoche y los que no', () => {
    expect(inQuiet(23, 22, 7)).toBe(true);
    expect(inQuiet(3, 22, 7)).toBe(true);
    expect(inQuiet(7, 22, 7)).toBe(false);
    expect(inQuiet(14, 13, 15)).toBe(true);
    expect(inQuiet(15, 13, 15)).toBe(false);
    expect(inQuiet(10, 8, 8)).toBe(false);
  });

  it('pasa el aviso al final del silencio, el mismo día o el siguiente', () => {
    expect(deferPastQuiet(new Date(2026, 9, 6, 23, 30), 22, 7)).toEqual(new Date(2026, 9, 7, 7, 0));
    expect(deferPastQuiet(new Date(2026, 9, 7, 2, 0), 22, 7)).toEqual(new Date(2026, 9, 7, 7, 0));
    const noon = new Date(2026, 9, 7, 12, 0);
    expect(deferPastQuiet(noon, 22, 7)).toBe(noon);
  });
});
