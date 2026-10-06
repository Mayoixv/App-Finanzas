import { compactMoney, niceMax } from './scale';

describe('escala de gráficas', () => {
  it('redondea el tope del eje a un número limpio', () => {
    expect(niceMax(9_100_000)).toBe(10_000_000);
    expect(niceMax(130)).toBe(200);
    expect(niceMax(0)).toBe(4);
  });

  it('acorta montos para los ejes', () => {
    expect(compactMoney(4_500_000)).toBe('45k');
    expect(compactMoney(120_000_000)).toBe('1.2M');
    expect(compactMoney(-250_000)).toBe('-2.5k');
    expect(compactMoney(50_000)).toBe('500');
  });
});
