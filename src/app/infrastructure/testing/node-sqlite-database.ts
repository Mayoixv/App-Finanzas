import { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { SqlDatabase, SqlValue } from '../sqlite/sql-database';

/** SQLite real en memoria (módulo nativo de Node) para probar migraciones y repositorios. */
export class NodeSqliteDatabase implements SqlDatabase {
  private readonly db = new DatabaseSync(':memory:');

  constructor() {
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  async run(sql: string, params: SqlValue[] = []): Promise<void> {
    this.db.prepare(sql).run(...(params as SQLInputValue[]));
  }

  async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as SQLInputValue[])) as T[];
  }

  async batch(statements: string[]): Promise<void> {
    this.db.exec('BEGIN');
    try {
      for (const s of statements) this.db.exec(s);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}
