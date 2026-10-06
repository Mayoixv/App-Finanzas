import { Account, AccountType, CASH_ACCOUNT_ID, dueDateAfter, isCard, lastCutDate, Transfer } from '../../domain/account';
import { isValidCents } from '../../domain/money';
import { daysBetween, IsoDate, isValidIsoDate } from '../../domain/month';
import { NotFoundError, ValidationError } from '../errors';
import { IAccountRepository, IdGenerator } from '../ports/repositories';

const TYPES: AccountType[] = ['efectivo', 'banco', 'ahorro', 'tarjeta', 'inversion'];

export interface AccountFields {
  name: string;
  type: AccountType;
  initialBalance: number;
  creditLimit?: number | null;
  cutDay?: number | null;
  dueDay?: number | null;
}

const validDay = (d: number | null | undefined) => typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 31;

export class SaveAccount {
  constructor(
    private readonly accounts: IAccountRepository,
    private readonly ids: IdGenerator,
  ) {}

  /** Crea una cuenta, o la edita si llega `id`. Los datos de tarjeta solo se guardan en tarjetas. */
  async execute(input: AccountFields, id?: string): Promise<Account> {
    const current = id ? await this.accounts.get(id) : undefined;
    if (id && !current) throw new NotFoundError('Cuenta');
    const name = input.name.trim();
    if (!name) throw new ValidationError('Escribe un nombre para la cuenta');
    if (!TYPES.includes(input.type)) throw new ValidationError('Tipo de cuenta inválido');
    if (!Number.isInteger(input.initialBalance)) throw new ValidationError('Saldo inicial inválido');
    if (id === CASH_ACCOUNT_ID && input.type !== 'efectivo') throw new ValidationError('Efectivo no puede cambiar de tipo');
    const card = isCard(input);
    if (card) {
      if (!isValidCents(input.creditLimit ?? 0)) throw new ValidationError('Escribe el límite de la tarjeta');
      if (!validDay(input.cutDay)) throw new ValidationError('El día de corte debe estar entre 1 y 31');
      if (!validDay(input.dueDay)) throw new ValidationError('El día de pago debe estar entre 1 y 31');
    }
    const account: Account = {
      id: id ?? this.ids.next(),
      name,
      type: input.type,
      initialBalance: input.initialBalance,
      creditLimit: card ? input.creditLimit : null,
      cutDay: card ? input.cutDay : null,
      dueDay: card ? input.dueDay : null,
      archived: current?.archived ?? false,
    };
    await this.accounts.save(account);
    return account;
  }
}

export class ArchiveAccount {
  constructor(private readonly accounts: IAccountRepository) {}

  async execute(id: string, archived: boolean): Promise<void> {
    if (id === CASH_ACCOUNT_ID && archived) throw new ValidationError('Efectivo no se puede archivar');
    const account = await this.accounts.get(id);
    if (!account) throw new NotFoundError('Cuenta');
    await this.accounts.save({ ...account, archived });
  }
}

export class DeleteAccount {
  constructor(private readonly accounts: IAccountRepository) {}

  /** Solo cuentas sin historial; las que tienen movimientos se archivan para no perderlos. */
  async execute(id: string): Promise<void> {
    if (id === CASH_ACCOUNT_ID) throw new ValidationError('Efectivo no se puede eliminar');
    if (await this.accounts.isInUse(id)) {
      throw new ValidationError('Esta cuenta tiene movimientos. Archívala para ocultarla sin perder su historial.');
    }
    await this.accounts.delete(id);
  }
}

export class AdjustAccountBalance {
  constructor(private readonly accounts: IAccountRepository) {}

  /**
   * Hace que el saldo calculado sea el real cambiando el saldo inicial. No crea un movimiento:
   * así el ajuste no se cuenta como ingreso ni gasto del mes.
   */
  async execute(id: string, realBalance: number): Promise<void> {
    if (!Number.isInteger(realBalance)) throw new ValidationError('Saldo inválido');
    const account = await this.accounts.get(id);
    if (!account) throw new NotFoundError('Cuenta');
    const current = (await this.accounts.balances()).get(id) ?? account.initialBalance;
    await this.accounts.save({ ...account, initialBalance: account.initialBalance + (realBalance - current) });
  }
}

export interface AccountView {
  account: Account;
  balance: number;
}

export interface AccountsOverview {
  accounts: AccountView[];
  /** Lo que tienes: suma de las cuentas que no son tarjetas. */
  assets: number;
  /** Lo que debes en tarjetas (positivo). */
  cardDebt: number;
}

export class GetAccountsOverview {
  constructor(private readonly accounts: IAccountRepository) {}

  async execute(): Promise<AccountsOverview> {
    const [accounts, balances] = await Promise.all([this.accounts.list(), this.accounts.balances()]);
    const views = accounts.map((account) => ({ account, balance: balances.get(account.id) ?? account.initialBalance }));
    const active = views.filter((v) => !v.account.archived || v.balance !== 0);
    return {
      accounts: views,
      assets: active.filter((v) => !isCard(v.account)).reduce((s, v) => s + v.balance, 0),
      cardDebt: active.filter((v) => isCard(v.account)).reduce((s, v) => s + Math.max(0, -v.balance), 0),
    };
  }
}

export interface TransferFields {
  date: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  note?: string;
}

export class SaveTransfer {
  constructor(
    private readonly accounts: IAccountRepository,
    private readonly ids: IdGenerator,
  ) {}

  /** Crea una transferencia, o la edita si llega `id`. */
  async execute(input: TransferFields, id?: string): Promise<Transfer> {
    if (id && !(await this.accounts.getTransfer(id))) throw new NotFoundError('Transferencia');
    if (!isValidCents(input.amount)) throw new ValidationError('El monto debe ser mayor que cero');
    if (!isValidIsoDate(input.date)) throw new ValidationError('Fecha inválida');
    if (input.fromAccountId === input.toAccountId) throw new ValidationError('Elige dos cuentas distintas');
    for (const accountId of [input.fromAccountId, input.toAccountId]) {
      if (!(await this.accounts.get(accountId))) throw new NotFoundError('Cuenta');
    }
    const transfer: Transfer = {
      id: id ?? this.ids.next(),
      date: input.date,
      amount: input.amount,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      note: input.note?.trim() ?? '',
    };
    await this.accounts.saveTransfer(transfer);
    return transfer;
  }
}

export class DeleteTransfer {
  constructor(private readonly accounts: IAccountRepository) {}

  /** Devuelve la transferencia borrada para poder deshacer. */
  async execute(id: string): Promise<Transfer | undefined> {
    const transfer = await this.accounts.getTransfer(id);
    if (transfer) await this.accounts.deleteTransfer(id);
    return transfer;
  }
}

export interface CardStatus {
  account: Account;
  /** Fecha del último corte y fecha límite para pagar ese estado. */
  lastCut: IsoDate;
  dueDate: IsoDate;
  /** Días hasta la fecha de pago (negativo si ya pasó). */
  daysToDue: number;
  /** Lo que se debía al cortar. */
  statementDebt: number;
  /** Pagos hechos a la tarjeta desde el corte. */
  paidSinceCut: number;
  /** Lo que falta pagar del estado para no pagar intereses. */
  pending: number;
  /** Compras y cargos desde el corte (irán al próximo estado). */
  cycleCharges: number;
  currentDebt: number;
  /** Porcentaje del límite usado; null si no tiene límite. */
  utilization: number | null;
}

export class GetCardStatuses {
  constructor(private readonly accounts: IAccountRepository) {}

  /** Estado de cada tarjeta activa con días de corte y pago. */
  async execute(today: IsoDate): Promise<CardStatus[]> {
    const cards = (await this.accounts.list()).filter((a) => isCard(a) && !a.archived && a.cutDay && a.dueDay);
    if (cards.length === 0) return [];
    const [now, transfers] = await Promise.all([this.accounts.balances(today), this.accounts.listTransfers()]);
    const out: CardStatus[] = [];
    for (const account of cards) {
      const lastCut = lastCutDate(account.cutDay!, today);
      const dueDate = dueDateAfter(lastCut, account.dueDay!);
      const atCut = (await this.accounts.balances(lastCut)).get(account.id) ?? account.initialBalance;
      const statementDebt = Math.max(0, -atCut);
      const currentDebt = Math.max(0, -(now.get(account.id) ?? account.initialBalance));
      const paidSinceCut = transfers
        .filter((t) => t.toAccountId === account.id && t.date > lastCut && t.date <= today)
        .reduce((s, t) => s + t.amount, 0);
      out.push({
        account,
        lastCut,
        dueDate,
        daysToDue: daysBetween(today, dueDate),
        statementDebt,
        paidSinceCut,
        pending: Math.max(0, statementDebt - paidSinceCut),
        cycleCharges: Math.max(0, currentDebt - statementDebt + paidSinceCut),
        currentDebt,
        utilization: account.creditLimit ? (currentDebt / account.creditLimit) * 100 : null,
      });
    }
    return out;
  }
}
