import { amortization, installment, simulateStrategy, splitPayment } from './debts';

describe('deudas', () => {
  it('cuota fija: RD$10,000 al 12% anual en 12 meses es RD$888.49', () => {
    expect(installment(1_000_000, 12, 12)).toBe(88_849);
    expect(installment(120_000, 0, 12)).toBe(10_000);
    expect(installment(120_000, 12, null)).toBe(0);
  });

  it('la tabla de amortización termina en 0 y su capital suma el préstamo exacto', () => {
    const rows = amortization(1_000_000, 12, 12);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({ n: 1, payment: 88_849, interest: 10_000, principal: 78_849, balance: 921_151 });
    expect(rows.at(-1)!.balance).toBe(0);
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBe(1_000_000);
    // Interés total de referencia: 12 × 888.49 − 10,000 ≈ 661.85 (±1 centavo por el redondeo de la última cuota).
    expect(Math.abs(rows.reduce((s, r) => s + r.interest, 0) - 66_188)).toBeLessThanOrEqual(2);
  });

  it('un pago cubre primero el interés del mes y luego baja el saldo', () => {
    expect(splitPayment(1_000_000, 12, 88_849)).toEqual({ interest: 10_000, principal: 78_849 });
    expect(splitPayment(5_000, 24, 100)).toEqual({ interest: 100, principal: 0 });
    expect(splitPayment(5_000, 0, 9_999)).toEqual({ interest: 0, principal: 5_000 });
  });

  it('avalancha paga menos interés que bola de nieve; bola de nieve salda primero la más chica', () => {
    const debts = [
      { id: 'tarjeta', balance: 4_000_00, annualRate: 60, minPayment: 100_00 },
      { id: 'prestamo', balance: 1_500_00, annualRate: 10, minPayment: 50_00 },
    ];
    const snow = simulateStrategy(debts, 400_00, 'bola_de_nieve');
    const aval = simulateStrategy(debts, 400_00, 'avalancha');
    expect(snow.order[0]).toBe('prestamo');
    expect(aval.order[0]).toBe('tarjeta');
    expect(aval.totalInterest).toBeLessThan(snow.totalInterest);
    expect(snow.months).toBeGreaterThan(0);
  });

  it('si los pagos no cubren el interés, la deuda no se termina', () => {
    expect(simulateStrategy([{ id: 'x', balance: 100_000_00, annualRate: 60, minPayment: 100_00 }], 0, 'avalancha').months).toBeNull();
  });
});
