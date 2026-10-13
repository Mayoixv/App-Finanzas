import { ValidationError } from '../errors';
import { InMemoryCategories, InMemoryDebts, InMemoryRecurring, InMemoryTransactions, SequentialIds } from '../testing/in-memory';
import { AddRecurringExpense } from './add-recurring-expense';
import { AddTransaction } from './add-transaction';
import { CopyFromMonth, moveToMonth } from './copy-month';
import { GetMonthRecurringExpenses } from './get-month-recurring-expenses';
import { PayRecurringExpense } from './pay-recurring-expense';

function setup() {
  const categories = new InMemoryCategories();
  categories.items.set('sal', { id: 'sal', name: 'Salario', type: 'ingreso' });
  categories.items.set('ren', { id: 'ren', name: 'Renta', type: 'fijo' });
  categories.items.set('com', { id: 'com', name: 'Comida', type: 'variable' });
  categories.items.set('gas', { id: 'gas', name: 'Gasolina', type: 'variable' });
  const transactions = new InMemoryTransactions();
  const recurring = new InMemoryRecurring();
  const debts = new InMemoryDebts();
  const ids = new SequentialIds();
  const add = new AddTransaction(transactions, categories, ids);
  return { categories, transactions, recurring, ids, add, copy: new CopyFromMonth(transactions, categories, recurring, debts, add) };
}

describe('copiar de otro mes', () => {
  it('mueve la fecha al mismo día, o al último día si el mes es más corto', () => {
    expect(moveToMonth('2026-09-15', '2026-10')).toBe('2026-10-15');
    expect(moveToMonth('2026-08-31', '2026-09')).toBe('2026-09-30');
    expect(moveToMonth('2026-01-31', '2026-02')).toBe('2026-02-28');
  });

  it('copia gastos al mes destino sin tocar el original, y deja fuera los pagos de Fijos', async () => {
    const s = setup();
    const food = await s.add.execute({ date: '2026-09-05', amount: 120_000, categoryId: 'com', note: 'Súper', tags: ['casa'] });
    const salary = await s.add.execute({ date: '2026-09-30', amount: 3_000_000, categoryId: 'sal' });
    const rent = await new AddRecurringExpense(s.recurring, s.categories, s.ids).execute({
      name: 'Renta', amount: 1_500_000, categoryId: 'ren', dueDay: 1, startMonth: '2026-09',
    });
    await new GetMonthRecurringExpenses(s.recurring).execute('2026-09');
    await new PayRecurringExpense(s.recurring, s.transactions, s.ids).execute({ recurringExpenseId: rent.id, month: '2026-09', paidDate: '2026-09-01' });

    const candidates = await s.copy.candidates('2026-09');
    expect(candidates.map((c) => [c.transaction.amount, c.income, c.fromFixed])).toEqual([
      [1_500_000, false, true],
      [120_000, false, false],
      [3_000_000, true, false],
    ]);

    // Un pago de Fijos no se puede copiar.
    const fixedId = candidates[0].transaction.id;
    await expect(s.copy.execute('2026-09', '2026-10', [{ transactionId: fixedId, amount: 1_500_000 }])).rejects.toThrow(ValidationError);

    const created = await s.copy.execute('2026-09', '2026-10', [
      { transactionId: food.id, amount: 130_000 },
      { transactionId: salary.id, amount: 3_000_000 },
    ]);
    expect(created.map((t) => [t.date, t.amount, t.categoryId, t.note])).toEqual([
      ['2026-10-05', 130_000, 'com', 'Súper'],
      ['2026-10-30', 3_000_000, 'sal', ''],
    ]);
    expect(created[0].tags).toEqual(['casa']);
    expect((await s.transactions.listByMonth('2026-09')).map((t) => t.amount).sort()).toEqual([120_000, 1_500_000, 3_000_000].sort());
  });

  it('si una copia falla, no queda ninguna', async () => {
    const s = setup();
    const food = await s.add.execute({ date: '2026-09-05', amount: 120_000, categoryId: 'com' });
    await expect(
      s.copy.execute('2026-09', '2026-10', [
        { transactionId: food.id, amount: 120_000 },
        { transactionId: food.id, amount: 0 },
      ]),
    ).rejects.toThrow(ValidationError);
    expect(await s.transactions.listByMonth('2026-10')).toEqual([]);
  });

  it('un dividido conserva sus partes solo si el monto no cambia', async () => {
    const s = setup();
    const mixed = await s.add.execute({
      date: '2026-09-10', amount: 300, categoryId: 'com',
      splits: [{ categoryId: 'com', amount: 200 }, { categoryId: 'gas', amount: 100 }],
    });
    const [same] = await s.copy.execute('2026-09', '2026-10', [{ transactionId: mixed.id, amount: 300 }]);
    expect(same.splits).toHaveLength(2);
    const [changed] = await s.copy.execute('2026-09', '2026-11', [{ transactionId: mixed.id, amount: 350 }]);
    expect(changed.splits).toEqual([]);
  });
});
