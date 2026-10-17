import { Category } from './category';
import { monthRecap, weekday } from './month-recap';
import { MonthlySummary } from './monthly-summary';
import { Transaction } from './transaction';

const categories: Category[] = [
  { id: 'sal', name: 'Salario', type: 'ingreso' },
  { id: 'com', name: 'Comida', type: 'variable' },
  { id: 'luz', name: 'Luz', type: 'fijo' },
];
const tx = (date: string, amount: number, categoryId: string): Transaction => ({ id: date + categoryId, date, amount, categoryId, note: '' });
const summary = (month: string, saved: number): MonthlySummary => ({
  month, income: 100, expenses: 0, saved, balance: 0, savingsPercent: saved, rating: 'regular',
});

describe('monthRecap', () => {
  // 2026-10-03 y 2026-10-10 son sábados.
  const october = [tx('2026-10-01', 9000, 'sal'), tx('2026-10-03', 6000, 'com'), tx('2026-10-10', 2000, 'com'), tx('2026-10-05', 2000, 'luz')];
  const september = [tx('2026-09-04', 4000, 'com'), tx('2026-09-05', 2000, 'luz')];

  it('saca los datos del mes sin montos', () => {
    const facts = monthRecap('2026-10', october, september, categories, [summary('2026-10', 12), summary('2026-09', 5), summary('2026-08', 0)], '2026-11-02');
    expect(facts).toEqual([
      { kind: 'count', count: 4 },
      { kind: 'top', name: 'Comida', percent: 80 },
      { kind: 'change', name: 'Comida', percent: 100 },
      { kind: 'weekday', weekday: 6, percent: 80 },
      { kind: 'noSpend', days: 28 },
      { kind: 'saved', percent: 12 },
      { kind: 'streak', months: 2 },
    ]);
  });

  it('en el mes en curso cuenta los días sin gastar solo hasta hoy', () => {
    const facts = monthRecap('2026-10', october, [], categories, [], '2026-10-06');
    expect(facts.find((f) => f.kind === 'noSpend')).toEqual({ kind: 'noSpend', days: 4 });
  });

  it('weekday usa 0 para domingo', () => {
    expect(weekday('2026-10-04')).toBe(0);
  });
});
