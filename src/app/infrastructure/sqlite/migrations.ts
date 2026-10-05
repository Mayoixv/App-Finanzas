import { SqlDatabase } from './sql-database';

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

/** Nunca se edita una migración ya publicada: los cambios van en una versión nueva. */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'esquema inicial',
    statements: [
      `CREATE TABLE categories (
         id   TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         type TEXT NOT NULL CHECK (type IN ('ingreso', 'fijo', 'variable'))
       )`,
      `CREATE TABLE transactions (
         id          TEXT PRIMARY KEY,
         date        TEXT NOT NULL,
         amount      REAL NOT NULL CHECK (amount > 0),
         category_id TEXT NOT NULL REFERENCES categories(id),
         note        TEXT NOT NULL DEFAULT ''
       )`,
      `CREATE INDEX idx_transactions_date ON transactions(date)`,
      `CREATE TABLE recurring_expenses (
         id          TEXT PRIMARY KEY,
         name        TEXT NOT NULL,
         amount      REAL NOT NULL CHECK (amount > 0),
         category_id TEXT NOT NULL REFERENCES categories(id),
         due_day     INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
         active      INTEGER NOT NULL DEFAULT 1
       )`,
      `CREATE TABLE recurring_instances (
         recurring_expense_id TEXT NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
         month                TEXT NOT NULL,
         due_date             TEXT NOT NULL,
         amount               REAL NOT NULL,
         status               TEXT NOT NULL CHECK (status IN ('pagado', 'pendiente')),
         transaction_id       TEXT REFERENCES transactions(id) ON DELETE SET NULL,
         PRIMARY KEY (recurring_expense_id, month)
       )`,
      `CREATE TABLE savings_goals (
         id            TEXT PRIMARY KEY,
         name          TEXT NOT NULL,
         target_amount REAL NOT NULL CHECK (target_amount > 0)
       )`,
      `CREATE TABLE savings_contributions (
         id      TEXT PRIMARY KEY,
         goal_id TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
         date    TEXT NOT NULL,
         amount  REAL NOT NULL CHECK (amount > 0)
       )`,
      `CREATE INDEX idx_contributions_date ON savings_contributions(date)`,
      `CREATE TABLE budgets (
         id           TEXT PRIMARY KEY,
         category_id  TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
         month        TEXT NOT NULL,
         limit_amount REAL NOT NULL CHECK (limit_amount > 0),
         UNIQUE (category_id, month)
       )`,
    ],
  },
  {
    version: 2,
    name: 'categorías iniciales',
    statements: [
      `INSERT INTO categories (id, name, type) VALUES
         ('cat-salario', 'Salario', 'ingreso'),
         ('cat-otros-ingresos', 'Otros ingresos', 'ingreso'),
         ('cat-alquiler', 'Alquiler', 'fijo'),
         ('cat-servicios', 'Servicios', 'fijo'),
         ('cat-suscripciones', 'Suscripciones', 'fijo'),
         ('cat-comida', 'Comida', 'variable'),
         ('cat-transporte', 'Transporte', 'variable'),
         ('cat-salud', 'Salud', 'variable'),
         ('cat-ocio', 'Ocio', 'variable'),
         ('cat-otros-gastos', 'Otros gastos', 'variable')`,
    ],
  },
  {
    version: 3,
    name: 'mes de inicio de gastos fijos',
    statements: [
      `ALTER TABLE recurring_expenses ADD COLUMN start_month TEXT NOT NULL DEFAULT '0000-01'`,
    ],
  },
  {
    version: 4,
    name: 'montos en centavos',
    // Se pasan a enteros para que sumar y comparar montos sea exacto.
    statements: [
      `UPDATE transactions SET amount = CAST(ROUND(amount * 100) AS INTEGER)`,
      `UPDATE recurring_expenses SET amount = CAST(ROUND(amount * 100) AS INTEGER)`,
      `UPDATE recurring_instances SET amount = CAST(ROUND(amount * 100) AS INTEGER)`,
      `UPDATE savings_goals SET target_amount = CAST(ROUND(target_amount * 100) AS INTEGER)`,
      `UPDATE savings_contributions SET amount = CAST(ROUND(amount * 100) AS INTEGER)`,
      `UPDATE budgets SET limit_amount = CAST(ROUND(limit_amount * 100) AS INTEGER)`,
    ],
  },
  {
    version: 5,
    name: 'ajustes',
    statements: [
      `CREATE TABLE settings (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    ],
  },
];

/** Aplica las migraciones pendientes en orden y devuelve las versiones aplicadas. */
export async function runMigrations(
  db: SqlDatabase,
  migrations: Migration[] = MIGRATIONS,
): Promise<number[]> {
  await db.run(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version    INTEGER PRIMARY KEY,
       name       TEXT NOT NULL,
       applied_at TEXT NOT NULL
     )`,
  );
  const done = await db.all<{ version: number }>('SELECT version FROM schema_migrations');
  const applied = new Set(done.map((r) => r.version));
  const ran: number[] = [];

  for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
    if (applied.has(m.version)) continue;
    await db.batch([
      ...m.statements,
      `INSERT INTO schema_migrations (version, name, applied_at)
       VALUES (${m.version}, '${m.name.replace(/'/g, "''")}', '${new Date().toISOString()}')`,
    ]);
    ran.push(m.version);
  }
  return ran;
}
