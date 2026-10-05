import { NodeSqliteDatabase } from './testing/node-sqlite-database';
import { Migration, MIGRATIONS, runMigrations } from './sqlite/migrations';
import {
  SqliteBudgetRepository,
  SqliteCategoryRepository,
  SqliteRecurringExpenseRepository,
  SqliteSavingsRepository,
  SqliteSettingsRepository,
  SqliteTransactionRepository,
} from './repositories/sqlite-repositories';

async function freshDb() {
  const db = new NodeSqliteDatabase();
  await runMigrations(db);
  return db;
}

describe('migraciones', () => {
  it('aplica todo una vez y no repite al volver a correr', async () => {
    const db = new NodeSqliteDatabase();
    expect(await runMigrations(db)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(await runMigrations(db)).toEqual([]);
  });

  it('una migración que falla no deja cambios a medias', async () => {
    const db = await freshDb();
    const broken: Migration = {
      version: 99,
      name: 'rota',
      statements: ['CREATE TABLE a (x INTEGER)', 'CREATE TABLE a (x INTEGER)'],
    };
    await expect(runMigrations(db, [...MIGRATIONS, broken])).rejects.toThrow();
    const tables = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE name = 'a'");
    expect(tables).toHaveLength(0);
    const versions = await db.all<{ version: number }>('SELECT version FROM schema_migrations');
    expect(versions.map((v) => v.version)).not.toContain(99);
  });
});

describe('repositorios SQLite', () => {
  it('la migración 2 deja categorías de los tres tipos', async () => {
    const types = new Set((await new SqliteCategoryRepository(await freshDb()).list()).map((c) => c.type));
    expect([...types].sort()).toEqual(['fijo', 'ingreso', 'variable']);
  });

  it('categorías: guarda, actualiza y borra', async () => {
    const repo = new SqliteCategoryRepository(await freshDb());
    await repo.save({ id: 'c1', name: 'Comida', type: 'variable' });
    await repo.save({ id: 'c1', name: 'Supermercado', type: 'variable' });
    expect(await repo.get('c1')).toEqual({ id: 'c1', name: 'Supermercado', type: 'variable' });
    await repo.delete('c1');
    expect(await repo.get('c1')).toBeUndefined();
  });

  it('transacciones: filtra por mes, incluidos los bordes', async () => {
    const db = await freshDb();
    await new SqliteCategoryRepository(db).save({ id: 'c1', name: 'Comida', type: 'variable' });
    const repo = new SqliteTransactionRepository(db);
    const t = (id: string, date: string) => ({ id, date, amount: 10, categoryId: 'c1', note: '' });
    await repo.save(t('a', '2026-09-30'));
    await repo.save(t('b', '2026-10-01'));
    await repo.save(t('c', '2026-10-31'));
    await repo.save(t('d', '2026-11-01'));
    expect((await repo.listByMonth('2026-10')).map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('no permite una transacción con categoría inexistente ni monto <= 0', async () => {
    const db = await freshDb();
    await new SqliteCategoryRepository(db).save({ id: 'c1', name: 'Comida', type: 'variable' });
    const repo = new SqliteTransactionRepository(db);
    await expect(
      repo.save({ id: 'x', date: '2026-10-01', amount: 5, categoryId: 'nope', note: '' }),
    ).rejects.toThrow();
    await expect(
      repo.save({ id: 'y', date: '2026-10-01', amount: 0, categoryId: 'c1', note: '' }),
    ).rejects.toThrow();
  });

  it('gastos fijos: guarda plantilla e instancia con su transacción', async () => {
    const db = await freshDb();
    await new SqliteCategoryRepository(db).save({ id: 'c1', name: 'Renta', type: 'fijo' });
    await new SqliteTransactionRepository(db).save({
      id: 't1',
      date: '2026-10-05',
      amount: 800,
      categoryId: 'c1',
      note: 'Renta',
    });
    const repo = new SqliteRecurringExpenseRepository(db);
    await repo.save({ id: 'r1', name: 'Renta', amount: 800, categoryId: 'c1', dueDay: 5, active: true, startMonth: '2026-10' });
    expect((await repo.get('r1'))?.active).toBe(true);

    const base = {
      recurringExpenseId: 'r1',
      month: '2026-10',
      dueDate: '2026-10-05',
      amount: 800,
    };
    await repo.saveInstance({ ...base, status: 'pendiente' });
    await repo.saveInstance({ ...base, status: 'pagado', transactionId: 't1' });
    const instances = await repo.listInstances('2026-10');
    expect(instances).toEqual([{ ...base, status: 'pagado', transactionId: 't1' }]);
    expect(await repo.listInstances('2026-11')).toEqual([]);
    expect(await repo.findInstanceByTransaction('t1')).toMatchObject({ month: '2026-10' });
    await repo.insertInstanceIfMissing({ ...base, status: 'pendiente' });
    expect((await repo.listInstances('2026-10'))[0].status).toBe('pagado');
    expect((await repo.listInstancesOf('r1')).map((i) => i.month)).toEqual(['2026-10']);
    await repo.deleteInstance('r1', '2026-10');
    expect(await repo.listInstancesOf('r1')).toEqual([]);
  });

  it('ahorro: borrar una meta borra sus aportes', async () => {
    const repo = new SqliteSavingsRepository(await freshDb());
    await repo.saveGoal({ id: 'g1', name: 'Viaje', targetAmount: 5000 });
    await repo.saveContribution({ id: 'a', goalId: 'g1', date: '2026-10-10', amount: 200 });
    await repo.saveContribution({ id: 'b', goalId: 'g1', date: '2026-11-10', amount: 300 });
    expect(await repo.listContributionsByMonth('2026-10')).toHaveLength(1);
    await repo.deleteGoal('g1');
    expect(await repo.listContributions()).toEqual([]);
  });

  it('presupuestos: uno por categoría y mes', async () => {
    const db = await freshDb();
    await new SqliteCategoryRepository(db).save({ id: 'c1', name: 'Comida', type: 'variable' });
    const repo = new SqliteBudgetRepository(db);
    await repo.save({ id: 'b1', categoryId: 'c1', month: '2026-10', limit: 400 });
    await expect(
      repo.save({ id: 'b2', categoryId: 'c1', month: '2026-10', limit: 500 }),
    ).rejects.toThrow();
    expect(await repo.listByMonth('2026-10')).toEqual([
      { id: 'b1', categoryId: 'c1', month: '2026-10', limit: 400 },
    ]);
  });
});

describe('migraciones de montos y ajustes', () => {
  it('la migración 4 pasa a centavos los montos que ya existían', async () => {
    const db = new NodeSqliteDatabase();
    await runMigrations(db, MIGRATIONS.filter((m) => m.version <= 3));
    await db.run(`INSERT INTO transactions (id, date, amount, category_id, note) VALUES ('t', '2026-10-01', 12.5, 'cat-comida', '')`);
    await db.run(`INSERT INTO budgets (id, category_id, month, limit_amount) VALUES ('b', 'cat-comida', '2026-10', 0.1)`);
    await runMigrations(db);
    const tx = await new SqliteTransactionRepository(db).get('t');
    expect(tx?.amount).toBe(1250);
    expect((await new SqliteBudgetRepository(db).listByMonth('2026-10'))[0].limit).toBe(10);
  });

  it('los ajustes se guardan y se actualizan por clave', async () => {
    const repo = new SqliteSettingsRepository(await freshDb());
    expect(await repo.get('currency')).toBeUndefined();
    await repo.set('currency', 'USD');
    await repo.set('currency', 'DOP');
    expect(await repo.get('currency')).toBe('DOP');
  });
});

describe('categorías en uso', () => {
  it('isInUse detecta movimientos y gastos fijos', async () => {
    const db = await freshDb();
    const cats = new SqliteCategoryRepository(db);
    expect(await cats.isInUse('cat-comida')).toBe(false);
    await new SqliteTransactionRepository(db).save({ id: 't', date: '2026-10-01', amount: 100, categoryId: 'cat-comida', note: '' });
    expect(await cats.isInUse('cat-comida')).toBe(true);
    await new SqliteRecurringExpenseRepository(db).save({
      id: 'r', name: 'Luz', amount: 100, categoryId: 'cat-servicios', dueDay: 1, active: true, startMonth: '2026-10',
    });
    expect(await cats.isInUse('cat-servicios')).toBe(true);
  });
});
