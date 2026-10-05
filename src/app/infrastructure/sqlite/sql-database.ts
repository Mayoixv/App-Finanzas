export type SqlValue = string | number | null;

/** Acceso mínimo a SQLite; los repositorios no conocen el plugin que hay debajo. */
export interface SqlDatabase {
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** Ejecuta todas las sentencias en una sola transacción: o se aplican todas o ninguna. */
  batch(statements: string[]): Promise<void>;
}
