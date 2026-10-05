import { webcrypto } from 'node:crypto';
import { CreateBackup, OpenBackup, RestoreBackup } from '../application/use-cases/backup';
import { ValidationError } from '../application/errors';
import { MIGRATIONS, runMigrations } from './sqlite/migrations';
import { SqliteBackupStore } from './sqlite/sqlite-backup-store';
import { SqliteTransactionRepository } from './repositories/sqlite-repositories';
import { NodeSqliteDatabase } from './testing/node-sqlite-database';

// jsdom no trae crypto.subtle; en el navegador y en Android sí existe.
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

async function dbWith(amounts: number[]) {
  const db = new NodeSqliteDatabase();
  await runMigrations(db);
  const repo = new SqliteTransactionRepository(db);
  for (const [i, amount] of amounts.entries()) {
    await repo.save({ id: `t${i}`, date: `2026-1${i % 2}-0${i + 1}`, amount, categoryId: 'cat-comida', note: 'nota, con coma' });
  }
  return { db, repo, store: new SqliteBackupStore(db) };
}

describe('respaldo', () => {
  it('cifra, descifra y restaura en otra base exactamente los mismos datos', async () => {
    const a = await dbWith([1250, 99]);
    const file = await new CreateBackup(a.store).execute('secreta1');
    expect(file).not.toContain('nota, con coma');

    const { data, summary } = await new OpenBackup().execute(file, 'secreta1');
    expect(summary).toEqual({ transactions: 2, firstMonth: '2026-10', lastMonth: '2026-11' });

    const b = await dbWith([5]);
    await new RestoreBackup(b.store).execute(data);
    expect(await b.repo.listAll()).toEqual(await a.repo.listAll());
  });

  it('maneja respaldos grandes (más de 1 MB)', async () => {
    const a = await dbWith([100]);
    await a.repo.save({ id: 'big', date: '2026-10-09', amount: 1, categoryId: 'cat-comida', note: 'x'.repeat(1_200_000) });
    const { data } = await new OpenBackup().execute(await new CreateBackup(a.store).execute('secreta1'), 'secreta1');
    expect(data.tables['transactions'].find((t) => t['id'] === 'big')?.['note']).toHaveLength(1_200_000);
  });

  it('rechaza contraseña incorrecta, contraseñas cortas y archivos que no son respaldos', async () => {
    const a = await dbWith([100]);
    const file = await new CreateBackup(a.store).execute('secreta1');
    await expect(new OpenBackup().execute(file, 'otra-clave')).rejects.toThrow('Contraseña incorrecta');
    await expect(new OpenBackup().execute('{"hola":1}', 'x')).rejects.toThrow(ValidationError);
    await expect(new CreateBackup(a.store).execute('123')).rejects.toThrow(ValidationError);
  });

  it('un respaldo viejo (montos en pesos, esquema 3) se migra a centavos al restaurar', async () => {
    const old = new NodeSqliteDatabase();
    await runMigrations(old, MIGRATIONS.filter((m) => m.version <= 3));
    await old.run(`INSERT INTO transactions (id, date, amount, category_id, note) VALUES ('v', '2026-10-01', 12.5, 'cat-comida', '')`);
    const data = await new SqliteBackupStore(old, MIGRATIONS.filter((m) => m.version <= 3)).dump();
    expect(data.schemaVersion).toBe(3);

    const b = await dbWith([]);
    await b.store.restore(data);
    expect((await b.repo.get('v'))?.amount).toBe(1250);
  });

  it('si el respaldo trae datos inválidos, deja la base como estaba', async () => {
    const b = await dbWith([700]);
    const before = await b.repo.listAll();
    const bad = await b.store.dump();
    bad.tables['transactions'] = [{ id: 'x', date: '2026-10-01', amount: -5, category_id: 'cat-comida', note: '' }];
    await expect(b.store.restore(bad)).rejects.toThrow();
    expect(await b.repo.listAll()).toEqual(before);
  });

  it('ignora tablas y columnas que no existen en el esquema (no se ejecuta nada del archivo)', async () => {
    const b = await dbWith([]);
    const data = await b.store.dump();
    data.tables['transactions'] = [{ id: 'ok', date: '2026-10-01', amount: 100, category_id: 'cat-comida', note: '', 'x); DROP TABLE categories; --': 1 }];
    data.tables['sqlite_master'] = [{ name: 'evil' }];
    await b.store.restore(data);
    expect((await b.repo.listAll()).map((t) => t.id)).toEqual(['ok']);
  });

  it('rechaza respaldos de una versión más nueva de la app', async () => {
    const b = await dbWith([]);
    await expect(b.store.restore({ schemaVersion: 999, tables: {} })).rejects.toThrow('versión más nueva');
  });
});
