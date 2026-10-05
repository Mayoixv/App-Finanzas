import { Category } from './category';
import { rateSavings, summarizeMonth } from './monthly-summary';
import { SavingsContribution } from './savings';
import { Transaction } from './transaction';

const categories: Category[] = [
  { id: 'sal', name: 'Salario', type: 'ingreso' },
  { id: 'ren', name: 'Renta', type: 'fijo' },
  { id: 'com', name: 'Comida', type: 'variable' },
];

const tx = (id: string, date: string, amount: number, categoryId: string): Transaction => ({
  id,
  date,
  amount,
  categoryId,
  note: '',
});

describe('summarizeMonth', () => {
  const transactions = [
    tx('1', '2026-10-01', 50000, 'sal'),
    tx('2', '2026-10-05', 15000, 'ren'),
    tx('3', '2026-10-10', 5000, 'com'),
    tx('4', '2026-09-30', 99999, 'sal'),
  ];
  const contributions: SavingsContribution[] = [
    { id: 'a', goalId: 'g', date: '2026-10-15', amount: 10000 },
    { id: 'b', goalId: 'g', date: '2026-11-01', amount: 7777 },
  ];

  it('calcula balance = ingresos - gastos - ahorrado solo del mes pedido', () => {
    const s = summarizeMonth('2026-10', transactions, categories, contributions);
    expect(s.income).toBe(50000);
    expect(s.expenses).toBe(20000);
    expect(s.saved).toBe(10000);
    expect(s.balance).toBe(20000);
    expect(s.savingsPercent).toBe(20);
    expect(s.rating).toBe('excelente');
  });

  it('devuelve 0% de ahorro sin ingresos', () => {
    const s = summarizeMonth('2026-08', [], categories, contributions);
    expect(s.savingsPercent).toBe(0);
    expect(s.rating).toBe('bajo');
  });
});

describe('rateSavings', () => {
  it('respeta los umbrales 20% y 10%', () => {
    expect(rateSavings(20)).toBe('excelente');
    expect(rateSavings(19.9)).toBe('regular');
    expect(rateSavings(10)).toBe('regular');
    expect(rateSavings(9.9)).toBe('bajo');
  });
});
