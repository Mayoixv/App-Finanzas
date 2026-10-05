import { ValidationError } from '../errors';
import { expandSplits, normalizeTags } from '../../domain/transaction';
import { summarizeMonth } from '../../domain/monthly-summary';
import {
  InMemoryBudgets,
  InMemoryCategories,
  InMemoryRecurring,
  InMemoryTransactions,
  SequentialIds,
} from '../testing/in-memory';
import { AddTransaction } from './add-transaction';
import { BulkUpdateTransactions } from './bulk-update-transactions';
import { DeleteTransaction, RestoreTransaction } from './delete-transaction';
import { GetBudgetStatuses } from './get-budget-statuses';

function setup() {
  const categories = new InMemoryCategories();
  const transactions = new InMemoryTransactions();
  categories.items.set('sal', { id: 'sal', name: 'Salario', type: 'ingreso' });
  categories.items.set('com', { id: 'com', name: 'Comida', type: 'variable' });
  categories.items.set('lim', { id: 'lim', name: 'Limpieza', type: 'variable' });
  categories.items.set('ren', { id: 'ren', name: 'Renta', type: 'fijo' });
  return { categories, transactions, add: new AddTransaction(transactions, categories, new SequentialIds()) };
}

describe('etiquetas', () => {
  it('recorta, quita comas y repetidas sin distinguir mayúsculas', () => {
    expect(normalizeTags(' Viaje , viaje,Samaná,  ,trabajo')).toEqual(['Viaje', 'Samaná', 'trabajo']);
    expect(normalizeTags(Array.from({ length: 15 }, (_, i) => `t${i}`))).toHaveLength(10);
  });
});

describe('dividir un gasto', () => {
  it('guarda las partes, usa la mayor como categoría y cuenta cada parte en resumen y presupuestos', async () => {
    const s = setup();
    const t = await s.add.execute({
      date: '2026-10-02', amount: 1000, categoryId: 'com',
      splits: [{ categoryId: 'lim', amount: 300 }, { categoryId: 'com', amount: 700 }],
    });
    expect(t.categoryId).toBe('com');
    expect(expandSplits([t]).map((x) => [x.categoryId, x.amount])).toEqual([['com', 700], ['lim', 300]]);
    expect(summarizeMonth('2026-10', [t], [...s.categories.items.values()], []).expenses).toBe(1000);

    const budgets = new InMemoryBudgets();
    budgets.items.set('b', { id: 'b', categoryId: 'lim', month: '2026-10', limit: 500 });
    const [status] = await new GetBudgetStatuses(budgets, s.transactions).execute('2026-10');
    expect(status.status.spent).toBe(300);
  });

  it('rechaza partes que no suman, repetidas, de un solo elemento o de distinto tipo', async () => {
    const s = setup();
    const base = { date: '2026-10-02', amount: 1000, categoryId: 'com' };
    for (const splits of [
      [{ categoryId: 'com', amount: 600 }, { categoryId: 'lim', amount: 300 }],
      [{ categoryId: 'com', amount: 500 }, { categoryId: 'com', amount: 500 }],
      [{ categoryId: 'com', amount: 1000 }],
      [{ categoryId: 'com', amount: 500 }, { categoryId: 'sal', amount: 500 }],
    ]) {
      await expect(s.add.execute({ ...base, splits })).rejects.toThrow(ValidationError);
    }
    // Fijo y variable son ambos gastos: se pueden mezclar.
    await expect(s.add.execute({ ...base, splits: [{ categoryId: 'com', amount: 500 }, { categoryId: 'ren', amount: 500 }] })).resolves.toBeTruthy();
  });
});

describe('edición masiva', () => {
  it('cambia categoría y fecha, y salta divididos y los de otro tipo', async () => {
    const s = setup();
    const a = await s.add.execute({ date: '2026-10-01', amount: 100, categoryId: 'com' });
    const b = await s.add.execute({ date: '2026-10-01', amount: 100, categoryId: 'sal' });
    const c = await s.add.execute({ date: '2026-10-01', amount: 100, categoryId: 'com', splits: [{ categoryId: 'com', amount: 50 }, { categoryId: 'lim', amount: 50 }] });
    const bulk = new BulkUpdateTransactions(s.transactions, s.categories);
    expect(await bulk.execute([a.id, b.id, c.id], { categoryId: 'lim' })).toEqual({ updated: 1, skipped: 2 });
    expect((await s.transactions.get(a.id))?.categoryId).toBe('lim');
    expect(await bulk.execute([a.id, b.id], { date: '2026-10-15' })).toEqual({ updated: 2, skipped: 0 });
    expect((await s.transactions.get(b.id))?.date).toBe('2026-10-15');
    await expect(bulk.execute([a.id], { date: '2026-02-30' })).rejects.toThrow(ValidationError);
  });
});

describe('fotos de recibos', () => {
  it('deshacer el borrado devuelve también las fotos', async () => {
    const s = setup();
    const recurring = new InMemoryRecurring();
    const t = await s.add.execute({ date: '2026-10-01', amount: 100, categoryId: 'com' });
    await s.transactions.saveAttachment({ id: 'f1', transactionId: t.id, data: 'data:image/jpeg;base64,AAA' });
    const deleted = await new DeleteTransaction(s.transactions, recurring).execute(t.id);
    s.transactions.attachments.clear(); // la base las borra en cascada
    await new RestoreTransaction(s.transactions, recurring).execute(deleted);
    expect(await s.transactions.listAttachments(t.id)).toHaveLength(1);
  });
});
