import { Account, isCard } from '../../domain/account';
import { BankImport, bankAlertKey, parseBankAlert } from '../../domain/bank-alert';
import { IsoDate } from '../../domain/month';
import { NotFoundError, ValidationError } from '../errors';
import { IAccountRepository, IBankImportRepository, IdGenerator, ISettingsRepository } from '../ports/repositories';
import { AddTransaction } from './add-transaction';

/** Texto de una notificación tal como la entrega Android, y cuándo llegó (ISO). */
export interface RawNotification {
  text: string;
  receivedAt: string;
  /** App que publicó la notificación; la pone Android, no se puede falsificar. */
  package?: string;
}

/** Solo la app de Qik puede anular compras: un correo lo puede escribir cualquiera (ver IngestBankNotifications). */
export const QIK_PACKAGE = 'com.qik.android.app';

export interface IngestResult {
  added: number;
  /** Compras pendientes que se quitaron porque el banco las reversó. */
  reversed: number;
}

/** Ajuste donde se guardan los últimos avisos de banco que no se pudieron leer, para mejorar el lector. */
export const UNRECOGNIZED_KEY = 'bank_unrecognized';
const MAX_UNRECOGNIZED = 5;

/** Los avisos que parecen de banco pero no se leyeron se guardan (pocos) para poder ajustar el lector. */
const looksLikeBank = (text: string) => /qik|banreservas|popular/i.test(text) && /RD\$|DOP|US\$|\$\s?\d/.test(text);

/** Guarda en "Por confirmar" las compras de las notificaciones; un reverso quita la compra pendiente que anula. */
export class IngestBankNotifications {
  constructor(
    private readonly imports: IBankImportRepository,
    private readonly settings: ISettingsRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(items: RawNotification[]): Promise<IngestResult> {
    const result: IngestResult = { added: 0, reversed: 0 };
    const unrecognized: string[] = [];
    for (const item of items) {
      const alert = parseBankAlert(item.text, item.receivedAt.slice(0, 10) as IsoDate);
      if (!alert) {
        if (looksLikeBank(item.text)) unrecognized.push(item.text.slice(0, 600));
        continue;
      }
      if (alert.kind === 'reverso') {
        // Un reverso borra una compra sin preguntar; si viniera por Gmail, cualquiera podría mandar ese correo.
        if (item.package !== QIK_PACKAGE) continue;
        const match = (await this.imports.listPending()).find(
          (p) => p.kind === 'compra' && p.bank === alert.bank && p.last4 === alert.last4 && p.amount === alert.amount,
        );
        if (match) {
          await this.imports.save({ ...match, status: 'descartado' });
          result.reversed++;
        }
        continue;
      }
      const added = await this.imports.insertIfNew({
        ...alert,
        id: this.ids.next(),
        key: bankAlertKey(alert),
        status: 'pendiente',
        receivedAt: item.receivedAt,
      });
      if (added) result.added++;
    }
    if (unrecognized.length) {
      const old: string[] = JSON.parse((await this.settings.get(UNRECOGNIZED_KEY)) ?? '[]');
      await this.settings.set(UNRECOGNIZED_KEY, JSON.stringify([...unrecognized, ...old].slice(0, MAX_UNRECOGNIZED)));
    }
    return result;
  }
}

export interface PendingImport {
  item: BankImport;
  /** La cuenta con esos últimos 4 dígitos, si hay una. */
  accountId: string | null;
  /** La categoría con que se confirmó antes ese comercio. */
  categoryId: string | null;
}

/** Comercio sin números ni la ciudad, para reconocerlo la próxima vez ("LA SIRENA INDEPEND MC" → "LA SIRENA"). */
export function merchantPrefix(merchant: string): string {
  const words = merchant.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ* ]/g, ' ').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(' ');
}

export class ListPendingImports {
  constructor(
    private readonly imports: IBankImportRepository,
    private readonly accounts: IAccountRepository,
  ) {}

  async execute(): Promise<PendingImport[]> {
    const [pending, accounts] = await Promise.all([this.imports.listPending(), this.accounts.list()]);
    const byLast4 = new Map(accounts.filter((a) => a.cardLast4 && !a.archived).map((a) => [a.cardLast4!, a]));
    const out: PendingImport[] = [];
    for (const item of pending) {
      const prefix = merchantPrefix(item.merchant);
      out.push({
        item,
        accountId: byLast4.get(item.last4)?.id ?? null,
        categoryId: prefix ? await this.imports.lastCategoryFor(prefix) : null,
      });
    }
    return out;
  }
}

export interface ConfirmImportInput {
  categoryId: string;
  accountId: string;
  /** Se puede corregir (por ejemplo, un cobro en dólares que hay que pasar a pesos). */
  amount: number;
  date: IsoDate;
  note: string;
}

/** Crea el gasto y marca el aviso como confirmado. */
export class ConfirmImport {
  constructor(
    private readonly imports: IBankImportRepository,
    private readonly addTransaction: AddTransaction,
  ) {}

  async execute(id: string, input: ConfirmImportInput): Promise<void> {
    const item = await this.imports.get(id);
    if (!item) throw new NotFoundError('Compra por confirmar');
    if (item.status !== 'pendiente') throw new ValidationError('Esta compra ya no está por confirmar');
    const tx = await this.addTransaction.execute({
      date: input.date,
      amount: input.amount,
      categoryId: input.categoryId,
      note: input.note,
      accountId: input.accountId,
    });
    await this.imports.save({ ...item, status: 'confirmado', transactionId: tx.id, categoryId: input.categoryId });
  }
}

export class DiscardImport {
  constructor(private readonly imports: IBankImportRepository) {}

  async execute(id: string): Promise<void> {
    const item = await this.imports.get(id);
    if (item?.status === 'pendiente') await this.imports.save({ ...item, status: 'descartado' });
  }
}

/** Tarjetas y cuentas a las que se les puede asignar los últimos 4 dígitos. */
export const canHaveCard = (a: Pick<Account, 'type'>) => isCard(a as Account) || a.type === 'banco' || a.type === 'ahorro';
