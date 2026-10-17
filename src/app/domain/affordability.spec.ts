import { canAfford } from './affordability';

describe('canAfford', () => {
  const today = '2026-10-21'; // faltan 11 días con hoy

  it('dice que sí y reparte lo que queda entre los días del mes', () => {
    const r = canAfford(10_000, 100_000, 20_000, [], today);
    expect(r).toEqual({ verdict: 'si', left: 70_000, perDay: 6363, days: 11, pending: 20_000 });
  });

  it('avisa que queda justo si se va más de la mitad de lo libre', () => {
    expect(canAfford(50_000, 100_000, 20_000, [], today).verdict).toBe('justo');
  });

  it('propone esperar al primer cobro con el que alcanza, ignorando los ya pasados', () => {
    const incomes = [
      { date: '2026-10-30', amount: 50_000 },
      { date: '2026-10-25', amount: 10_000 },
      { date: '2026-10-01', amount: 999_999 },
    ];
    const r = canAfford(100_000, 60_000, 0, incomes, today);
    expect(r.verdict).toBe('espera');
    expect(r.waitUntil).toBe('2026-10-30');
  });

  it('dice que no si ni con los cobros alcanza', () => {
    expect(canAfford(100_000, 10_000, 0, [{ date: '2026-10-30', amount: 5_000 }], today).verdict).toBe('no');
  });
});
