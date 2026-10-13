import { CASH_ACCOUNT_ID } from '../../domain/account';
import { CategoryType } from '../../domain/category';
import { Cents } from '../../domain/money';
import { IsoDate, isValidIsoDate } from '../../domain/month';
import { Transaction } from '../../domain/transaction';
import { IAccountRepository, ICategoryRepository, ISettingsRepository, ITransactionRepository } from '../ports/repositories';
import { SaveAccount } from './accounts';
import { AddTransaction } from './add-transaction';
import { AddCategory } from './manage-categories';

/** Columnas que entiende la importación, en el orden de la plantilla. */
export const IMPORT_FIELDS = ['date', 'type', 'amount', 'category', 'account', 'description', 'status'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export const REQUIRED_FIELDS: ImportField[] = ['date', 'type', 'amount', 'category', 'account'];

/** Lo que trae una celda leída del Excel o del CSV. */
export type Cell = string | number | boolean | Date | null | undefined;
/** Columna del archivo para cada campo (índice), o null si no está. */
export type ColumnMap = Record<ImportField, number | null>;

/** Palabras aceptadas en las columnas Tipo y Estado (las de todos los idiomas de la app, ya sin tildes). */
export interface ImportWords {
  expense: string[];
  income: string[];
  pending: string[];
}

export interface ImportRow {
  /** Número de fila en el archivo (la 1 es el encabezado). */
  line: number;
  date: IsoDate;
  income: boolean;
  amount: Cents;
  category: string;
  account: string;
  description: string;
}

export interface RowProblem {
  line: number;
  /** Clave del texto (import.errors.* en es.json). */
  key: string;
}

/** Sin tildes, sin mayúsculas y sin espacios de más: "Categoría " y "categoria" son lo mismo. */
export const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

const text = (cell: Cell) => (cell instanceof Date ? '' : String(cell ?? '').trim());

/** Encabezados conocidos (de cualquier idioma) → columna. */
export function guessColumns(headers: Cell[], aliases: Record<ImportField, string[]>): ColumnMap {
  const folded = headers.map((h) => fold(text(h)));
  const map = {} as ColumnMap;
  for (const field of IMPORT_FIELDS) {
    const names = new Set(aliases[field].map(fold));
    const index = folded.findIndex((h) => names.has(h));
    map[field] = index === -1 ? null : index;
  }
  return map;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Acepta 2026-10-05, 05/10/2026 (día primero), 5-10-26, fechas de Excel (Date o número de serie). */
export function parseImportDate(cell: Cell): IsoDate | null {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return `${cell.getFullYear()}-${pad(cell.getMonth() + 1)}-${pad(cell.getDate())}`;
  }
  if (typeof cell === 'number' && cell > 20000 && cell < 80000) {
    // Número de serie de Excel: días desde el 30/12/1899.
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(cell) * 86_400_000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const value = text(cell);
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(value);
  let iso = m ? `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` : null;
  if (!iso) {
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(value);
    if (m) iso = `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  return iso && isValidIsoDate(iso) ? iso : null;
}

/** Monto positivo en centavos. Acepta 1250.50, "1,250.50", "1.250,50", "RD$ 1,250". */
export function parseImportAmount(cell: Cell): Cents | null {
  let value: number;
  if (typeof cell === 'number') value = cell;
  else {
    let s = text(cell).replace(/[^\d.,-]/g, '');
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    // El último separador es el decimal si le siguen 1 o 2 cifras; los demás son de miles.
    const decimal = Math.max(lastDot, lastComma);
    if (decimal !== -1 && s.length - decimal - 1 <= 2) {
      s = s.slice(0, decimal).replace(/[.,]/g, '') + '.' + s.slice(decimal + 1);
    } else {
      s = s.replace(/[.,]/g, '');
    }
    value = s ? Number(s) : NaN;
  }
  if (!Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  return cents > 0 ? cents : null;
}

/** Lee las filas de datos (sin el encabezado). Las que tienen problemas no entran y se explican. */
export function readImportRows(
  table: Cell[][],
  columns: ColumnMap,
  words: ImportWords,
): { rows: ImportRow[]; problems: RowProblem[]; pending: number[] } {
  const rows: ImportRow[] = [];
  const problems: RowProblem[] = [];
  const pending: number[] = [];
  const has = (list: string[], value: string) => list.map(fold).includes(fold(value));
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (field: ImportField) => (columns[field] === null ? undefined : cells[columns[field]!]);
    if (cells.every((c) => text(c) === '' && !(c instanceof Date))) return;
    const status = text(get('status'));
    if (status && has(words.pending, status)) {
      pending.push(line);
      return;
    }
    const date = parseImportDate(get('date') ?? null);
    const type = text(get('type'));
    const income = has(words.income, type);
    const amount = parseImportAmount(get('amount') ?? null);
    const category = text(get('category'));
    const account = text(get('account'));
    const problem = !date
      ? 'date'
      : !income && !has(words.expense, type)
        ? 'type'
        : amount === null
          ? 'amount'
          : !category
            ? 'category'
            : !account
              ? 'account'
              : null;
    if (problem) problems.push({ line, key: `import.errors.${problem}` });
    else rows.push({ line, date: date!, income, amount: amount!, category, account, description: text(get('description')) });
  });
  return { rows, problems, pending };
}

/** Qué hacer con una categoría o cuenta del archivo que no existe en la app: crearla o usar una existente. */
export type Resolution = { create: true } | { use: string };

export interface ImportPlan {
  rows: ImportRow[];
  /** Por nombre (con `fold`), para las que no existen. */
  categories: Record<string, Resolution>;
  accounts: Record<string, Resolution>;
}

/** Lo que creó una importación, para poder deshacerla. */
export interface ImportRecord {
  id: string;
  date: IsoDate;
  transactionIds: string[];
  categoryIds: string[];
  accountIds: string[];
}

const IMPORTS_KEY = 'imports';
/** Solo se puede deshacer la última importación; se guardan algunas más por si acaso. */
const KEEP_RECORDS = 5;

export class ImportTransactions {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly accounts: IAccountRepository,
    private readonly settings: ISettingsRepository,
    private readonly addTransaction: AddTransaction,
    private readonly addCategory: AddCategory,
    private readonly saveAccount: SaveAccount,
  ) {}

  /** Nombres (como vienen en el archivo) de categorías y cuentas que todavía no existen en la app. */
  async missing(rows: ImportRow[]): Promise<{ categories: { name: string; income: boolean }[]; accounts: string[] }> {
    const [categories, accounts] = await Promise.all([this.categories.list(), this.accounts.list()]);
    const knownCategories = new Set(categories.map((c) => fold(c.name)));
    const knownAccounts = new Set(accounts.map((a) => fold(a.name)));
    const newCategories = new Map<string, { name: string; income: boolean }>();
    const newAccounts = new Map<string, string>();
    for (const r of rows) {
      if (!knownCategories.has(fold(r.category))) newCategories.set(fold(r.category), { name: r.category, income: r.income });
      if (!knownAccounts.has(fold(r.account))) newAccounts.set(fold(r.account), r.account);
    }
    return { categories: [...newCategories.values()], accounts: [...newAccounts.values()] };
  }

  /** Líneas que parecen repetidas: ya hay un movimiento con la misma fecha, monto y descripción. */
  async duplicates(rows: ImportRow[]): Promise<number[]> {
    const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))];
    const existing = (await Promise.all(months.map((m) => this.transactions.listByMonth(m)))).flat();
    const keys = new Set(existing.map((t) => `${t.date}|${t.amount}|${fold(t.note)}`));
    return rows.filter((r) => keys.has(`${r.date}|${r.amount}|${fold(r.description)}`)).map((r) => r.line);
  }

  /** Importa todo o nada: si una fila falla, se borra lo que ya se había creado. */
  async execute(plan: ImportPlan, id: string, today: IsoDate): Promise<ImportRecord> {
    const record: ImportRecord = { id, date: today, transactionIds: [], categoryIds: [], accountIds: [] };
    try {
      const categories = new Map((await this.categories.list()).map((c) => [fold(c.name), c]));
      const accounts = new Map((await this.accounts.list()).map((a) => [fold(a.name), a.id]));
      const categoryFor = async (row: ImportRow): Promise<string> => {
        const key = fold(row.category);
        const found = categories.get(key);
        if (found) return found.id;
        const choice = plan.categories[key];
        if (choice && 'use' in choice) return choice.use;
        const type: CategoryType = row.income ? 'ingreso' : 'variable';
        const created = await this.addCategory.execute({ name: row.category, type });
        record.categoryIds.push(created.id);
        categories.set(key, created);
        return created.id;
      };
      const accountFor = async (row: ImportRow): Promise<string> => {
        const key = fold(row.account);
        const found = accounts.get(key);
        if (found) return found;
        const choice = plan.accounts[key];
        if (choice && 'use' in choice) return choice.use;
        const created = await this.saveAccount.execute({ name: row.account, type: 'banco', initialBalance: 0 });
        record.accountIds.push(created.id);
        accounts.set(key, created.id);
        return created.id;
      };
      for (const row of plan.rows) {
        const saved: Transaction = await this.addTransaction.execute({
          date: row.date,
          amount: row.amount,
          categoryId: await categoryFor(row),
          note: row.description,
          accountId: (await accountFor(row)) ?? CASH_ACCOUNT_ID,
        });
        record.transactionIds.push(saved.id);
      }
    } catch (error) {
      await this.remove(record);
      throw error;
    }
    const previous = await this.records();
    await this.settings.set(IMPORTS_KEY, JSON.stringify([record, ...previous].slice(0, KEEP_RECORDS)));
    return record;
  }

  async records(): Promise<ImportRecord[]> {
    try {
      return JSON.parse((await this.settings.get(IMPORTS_KEY)) || '[]') as ImportRecord[];
    } catch {
      return [];
    }
  }

  /** La última importación que todavía se puede deshacer. */
  async last(): Promise<ImportRecord | null> {
    return (await this.records())[0] ?? null;
  }

  /** Borra lo que creó la última importación: sus movimientos y las categorías y cuentas nuevas que ya no se usen. */
  async undoLast(): Promise<number> {
    const [last, ...rest] = await this.records();
    if (!last) return 0;
    await this.remove(last);
    await this.settings.set(IMPORTS_KEY, JSON.stringify(rest));
    return last.transactionIds.length;
  }

  private async remove(record: ImportRecord) {
    for (const id of record.transactionIds) await this.transactions.delete(id);
    for (const id of record.categoryIds) if (!(await this.categories.isInUse(id))) await this.categories.delete(id);
    for (const id of record.accountIds) if (!(await this.accounts.isInUse(id))) await this.accounts.delete(id);
  }
}
