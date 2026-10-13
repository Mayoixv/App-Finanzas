import { CASH_ACCOUNT_ID } from '../../domain/account';
import { InMemoryAccounts, InMemoryCategories, InMemorySettings, InMemoryTransactions, SequentialIds } from '../testing/in-memory';
import { SaveAccount } from './accounts';
import { AddTransaction } from './add-transaction';
import {
  Cell,
  guessColumns,
  ImportTransactions,
  ImportWords,
  parseImportAmount,
  parseImportDate,
  readImportRows,
} from './import-transactions';
import { AddCategory } from './manage-categories';

const ALIASES = {
  date: ['Fecha'],
  type: ['Tipo'],
  amount: ['Monto'],
  category: ['Categoría'],
  account: ['Cuenta'],
  description: ['Descripción'],
  status: ['Estado'],
};
const WORDS: ImportWords = { expense: ['Gasto'], income: ['Ingreso'], pending: ['Pendiente'] };

function setup() {
  const categories = new InMemoryCategories();
  categories.items.set('com', { id: 'com', name: 'Comida', type: 'variable' });
  categories.items.set('sal', { id: 'sal', name: 'Salario', type: 'ingreso' });
  const transactions = new InMemoryTransactions();
  const accounts = new InMemoryAccounts(transactions, categories);
  const ids = new SequentialIds();
  const add = new AddTransaction(transactions, categories, ids, accounts);
  const importer = new ImportTransactions(
    transactions, categories, accounts, new InMemorySettings(), add, new AddCategory(categories, ids), new SaveAccount(accounts, ids),
  );
  return { categories, transactions, accounts, add, importer };
}

describe('importar desde Excel', () => {
  it('entiende fechas y montos escritos de varias formas', () => {
    expect(parseImportDate('2026-10-05')).toBe('2026-10-05');
    expect(parseImportDate('05/10/2026')).toBe('2026-10-05');
    expect(parseImportDate('5-10-26')).toBe('2026-10-05');
    expect(parseImportDate(new Date(2026, 9, 5))).toBe('2026-10-05');
    expect(parseImportDate(46300)).toBe('2026-10-05');
    expect(parseImportDate('31/02/2026')).toBeNull();
    expect(parseImportAmount(1250.5)).toBe(125_050);
    expect(parseImportAmount('1,250.50')).toBe(125_050);
    expect(parseImportAmount('1.250,50')).toBe(125_050);
    expect(parseImportAmount('RD$ 1,250')).toBe(125_000);
    expect(parseImportAmount('-5')).toBeNull();
    expect(parseImportAmount('')).toBeNull();
  });

  it('reconoce las columnas aunque cambien de orden o de tildes, y dice qué fila arreglar', () => {
    const table: Cell[][] = [
      ['categoria', 'MONTO', 'Fecha', 'tipo', 'Cuenta', 'Descripcion', 'Estado'],
      ['Comida', 350, '2026-10-05', 'Gasto', 'Efectivo', 'Súper', ''],
      ['Comida', 'abc', '2026-10-06', 'Gasto', 'Efectivo', '', ''],
      ['Comida', 100, 'ayer', 'Gasto', 'Efectivo', '', ''],
      ['Luz', 900, '2026-10-07', 'Gasto', 'Efectivo', '', 'Pendiente'],
      ['', '', '', '', '', '', ''],
    ];
    const columns = guessColumns(table[0], ALIASES);
    expect(columns).toEqual({ date: 2, type: 3, amount: 1, category: 0, account: 4, description: 5, status: 6 });
    const { rows, problems, pending } = readImportRows(table, columns, WORDS);
    expect(rows.map((r) => [r.line, r.date, r.amount, r.description])).toEqual([[2, '2026-10-05', 35_000, 'Súper']]);
    expect(problems).toEqual([
      { line: 3, key: 'import.errors.amount' },
      { line: 4, key: 'import.errors.date' },
    ]);
    expect(pending).toEqual([5]);
  });

  it('crea las categorías y cuentas que faltan, importa todo y se puede deshacer', async () => {
    const s = setup();
    const rows = [
      { line: 2, date: '2026-10-05', income: false, amount: 35_000, category: 'comida', account: 'Efectivo', description: 'Súper' },
      { line: 3, date: '2026-10-06', income: false, amount: 9_000, category: 'Mascotas', account: 'Popular', description: '' },
      { line: 4, date: '2026-10-30', income: true, amount: 3_000_000, category: 'Bonos', account: 'Popular', description: '' },
    ];
    const missing = await s.importer.missing(rows);
    expect(missing).toEqual({ categories: [{ name: 'Mascotas', income: false }, { name: 'Bonos', income: true }], accounts: ['Popular'] });

    const record = await s.importer.execute(
      { rows, categories: { bonos: { use: 'sal' } }, accounts: {} },
      'imp-1',
      '2026-10-13',
    );
    expect(record.transactionIds).toHaveLength(3);
    expect(record.categoryIds).toHaveLength(1);
    expect(record.accountIds).toHaveLength(1);
    const october = await s.transactions.listByMonth('2026-10');
    expect(october.map((t) => t.categoryId)).toEqual(['com', record.categoryIds[0], 'sal']);
    expect(october[0].accountId).toBe(CASH_ACCOUNT_ID);
    expect(await s.importer.duplicates(rows)).toEqual([2, 3, 4]);

    expect(await s.importer.undoLast()).toBe(3);
    expect(await s.transactions.listByMonth('2026-10')).toEqual([]);
    expect(s.categories.items.has(record.categoryIds[0])).toBe(false);
    expect(await s.importer.last()).toBeNull();
  });

  it('si una fila no entra, no queda nada importado', async () => {
    const s = setup();
    const rows = [
      { line: 2, date: '2026-10-05', income: false, amount: 35_000, category: 'Nueva', account: 'Efectivo', description: '' },
      { line: 3, date: '2026-10-06', income: false, amount: 0, category: 'Comida', account: 'Efectivo', description: '' },
    ];
    await expect(s.importer.execute({ rows, categories: {}, accounts: {} }, 'imp-2', '2026-10-13')).rejects.toThrow();
    expect(await s.transactions.listByMonth('2026-10')).toEqual([]);
    expect([...s.categories.items.values()].some((c) => c.name === 'Nueva')).toBe(false);
  });
});
