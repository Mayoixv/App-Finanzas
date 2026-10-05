import {
  amountToInput,
  currentMonth,
  defaultDateFor,
  dueLabel,
  formatMoney,
  formatPercent,
  parseAmount,
  setDisplayCurrency,
  monthLabel,
  shiftMonth,
  todayIso,
} from './format';

describe('format', () => {
  it('shiftMonth cruza el cambio de año en ambos sentidos', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('currentMonth y todayIso usan la fecha local', () => {
    const d = new Date(2026, 9, 4);
    expect(currentMonth(d)).toBe('2026-10');
    expect(todayIso(d)).toBe('2026-10-04');
  });

  it('monthLabel va en español y con mayúscula inicial', () => {
    expect(monthLabel('2026-10')).toMatch(/^Octubre/);
  });

  it('formatPercent redondea a un decimal', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
    expect(formatPercent(20)).toBe('20%');
  });
});

describe('dueLabel', () => {
  const today = '2026-10-10';

  it('marca como urgente lo vencido o a 3 días o menos', () => {
    expect(dueLabel('2026-10-07', today)).toEqual({ text: 'Venció hace 3 días', urgent: true });
    expect(dueLabel('2026-10-09', today)).toEqual({ text: 'Venció ayer', urgent: true });
    expect(dueLabel('2026-10-10', today)).toEqual({ text: 'Vence hoy', urgent: true });
    expect(dueLabel('2026-10-11', today)).toEqual({ text: 'Vence mañana', urgent: true });
    expect(dueLabel('2026-10-13', today)).toEqual({ text: 'Vence en 3 días', urgent: true });
  });

  it('lo lejano no es urgente y pasados 7 días muestra la fecha', () => {
    expect(dueLabel('2026-10-14', today)).toEqual({ text: 'Vence en 4 días', urgent: false });
    expect(dueLabel('2026-10-25', today).urgent).toBe(false);
    expect(dueLabel('2026-10-25', today).text).toMatch(/^Vence el 25/);
    expect(dueLabel('2026-10-09', today, true).text).toBe('Debió cobrarse ayer');
  });
});

describe('montos en centavos', () => {
  afterEach(() => setDisplayCurrency('DOP'));

  it('parseAmount pasa lo escrito a centavos y rechaza lo que no es un monto', () => {
    expect(parseAmount('1250.5')).toBe(125050);
    expect(parseAmount('0.1')).toBe(10);
    expect(parseAmount(' 3 ')).toBe(300);
    for (const bad of ['', '0', '-5', 'abc', '0.001']) expect(parseAmount(bad)).toBeNull();
  });

  it('amountToInput y parseAmount son inversos', () => {
    for (const cents of [1, 10, 125050, 99999999]) expect(parseAmount(amountToInput(cents))).toBe(cents);
  });

  it('formatMoney recibe centavos y usa la moneda elegida', () => {
    expect(formatMoney(125050)).toBe('RD$1,250.50');
    setDisplayCurrency('USD');
    expect(formatMoney(125050)).toBe('US$1,250.50');
  });
});

describe('defaultDateFor', () => {
  it('propone hoy en el mes actual y el mismo día dentro de otro mes', () => {
    expect(defaultDateFor('2026-10', '2026-10-05')).toBe('2026-10-05');
    expect(defaultDateFor('2026-11', '2026-10-05')).toBe('2026-11-05');
    expect(defaultDateFor('2026-02', '2026-10-31')).toBe('2026-02-28');
  });
});
