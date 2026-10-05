import { Category } from './category';
import { expenseBreakdown } from './expense-breakdown';
import { Transaction } from './transaction';

const categories: Category[] = [
  { id: 'sal', name: 'Salario', type: 'ingreso' },
  { id: 'ren', name: 'Alquiler', type: 'fijo' },
  { id: 'com', name: 'Comida', type: 'variable' },
];

const tx = (id: string, date: string, amount: number, categoryId: string): Transaction => ({
  id,
  date,
  amount,
  categoryId,
  note: '',
});

describe('expenseBreakdown', () => {
  it('agrupa por categoría, ordena de mayor a menor y calcula porcentajes', () => {
    const result = expenseBreakdown(
      '2026-10',
      [
        tx('1', '2026-10-01', 9000, 'sal'),
        tx('2', '2026-10-02', 300, 'com'),
        tx('3', '2026-10-03', 100, 'com'),
        tx('4', '2026-10-05', 100, 'ren'),
        tx('5', '2026-09-30', 5000, 'ren'),
      ],
      categories,
    );
    expect(result.map((s) => [s.name, s.amount, s.percent])).toEqual([
      ['Comida', 400, 80],
      ['Alquiler', 100, 20],
    ]);
  });

  it('devuelve lista vacía si no hubo gastos', () => {
    expect(expenseBreakdown('2026-10', [tx('1', '2026-10-01', 10, 'sal')], categories)).toEqual([]);
  });
});
