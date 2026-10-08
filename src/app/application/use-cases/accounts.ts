import { Account, AccountType, CASH_ACCOUNT_ID, dueDateAfter, isCard, lastCutDate, Transfer } from '../../domain/account';
import { isValidCents } from '../../domain/money';
import { daysBetween, IsoDate, isValidIsoDate } from '../../domain/month';
import { DebtDirection } from '../../domain/debts';
import { NotFoundError, ValidationError } from '../errors';
import { GetDebtsOverview } from './debts';
import { IAccountRepository, IdGenerator, ISettingsRepository } from '../ports/repositories';

const TYPES: AccountType[] = ['efectivo', 'banco', 'ahorro', 'tarjeta', 'inversion'];

export interface AccountFields {
  name: string;
  type: AccountType;
  initialBalance: number;
  creditLimit?: number | null;
  cutDay?: number | null;
  dueDay?: number | null;
  /** Últimos 4 dígitos de su tarjeta (crédito o débito); vacío si no se usa para importar compras. */
  cardLast4?: string | null;
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
    const last4 = input.cardLast4?.trim() || null;
    if (last4 && !/^\d{4}$/.test(last4)) throw new ValidationError('Escribe los últimos 4 dígitos de la tarjeta');
    if (last4 && (await this.accounts.list()).some((a) => a.id !== id && a.cardLast4 === last4)) {
      throw new ValidationError('Otra cuenta ya usa esos 4 dígitos');
    }
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
      cardLast4: input.type === 'efectivo' ? null : last4,
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
  /** Pago mínimo de este estado, si el usuario lo anotó (lo fija cada banco). */
  minimum: number | null;
}

/**
 * Clave del pago mínimo de una tarjeta para el estado que cortó en `cut`.
 * ponytail: una fila de ajustes por tarjeta y mes que no se borra (unas 12 al año por tarjeta); si crece, pasar a
 * una columna de la tabla de cuentas con una migración.
 */
const minimumKey = (accountId: string, cut: IsoDate) => `card_min:${accountId}:${cut}`;

export class SetCardMinimum {
  constructor(private readonly settings: ISettingsRepository) {}

  /** Guarda (o borra, con null) el pago mínimo del estado que cortó en `cut`. */
  async execute(accountId: string, cut: IsoDate, amount: number | null): Promise<void> {
    if (amount !== null && !isValidCents(amount)) throw new ValidationError('El pago mínimo debe ser mayor que cero');
    await this.settings.set(minimumKey(accountId, cut), amount === null ? '' : String(amount));
  }
}

export class GetCardStatuses {
  constructor(
    private readonly accounts: IAccountRepository,
    private readonly settings: ISettingsRepository,
  ) {}

  /** Estado de cada tarjeta activa con días de corte y pago. */
  async execute(today: IsoDate): Promise<CardStatus[]> {
    const cards = (await this.accounts.list()).filter((a) => isCard(a) && !a.archived && a.cutDay && a.dueDay);
    if (cards.length === 0) return [];
    const [now, transfers] = await Promise.all([this.accounts.balances(today), this.accounts.listTransfers()]);
    const cuts = cards.map((a) => lastCutDate(a.cutDay!, today));
    const [atCuts, minimums] = await Promise.all([
      Promise.all(cuts.map((cut) => this.accounts.balances(cut))),
      Promise.all(cards.map((a, i) => this.settings.get(minimumKey(a.id, cuts[i])))),
    ]);
    const out: CardStatus[] = [];
    for (const [i, account] of cards.entries()) {
      const lastCut = cuts[i];
      const dueDate = dueDateAfter(lastCut, account.dueDay!);
      const atCut = atCuts[i].get(account.id) ?? account.initialBalance;
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
        minimum: Number(minimums[i] || 0) || null,
      });
    }
    return out;
  }
}

export interface NetWorth {
  /** Disponible: saldo de cuentas y efectivo, sin tarjetas. Lo que te deben no cuenta: todavía no se puede usar. */
  available: number;
  /** Lo que te deben (deudas "me deben" pendientes). */
  owedToMe: number;
  /** available + owedToMe. */
  have: number;
  /** Lo que debes: tarjetas más deudas. */
  owe: number;
  /** have − owe. */
  total: number;
}

/** Patrimonio: cuentas − tarjetas − deudas + préstamos hechos a otros. */
export class GetNetWorth {
  constructor(
    private readonly accounts: GetAccountsOverview,
    private readonly debts: GetDebtsOverview,
  ) {}

  async execute(): Promise<NetWorth> {
    const [accounts, debts] = await Promise.all([this.accounts.execute(), this.debts.execute()]);
    const sum = (dir: DebtDirection) => debts.filter((d) => d.debt.direction === dir).reduce((s, d) => s + Math.max(0, d.balance), 0);
    const owedToMe = sum('me_deben');
    const have = accounts.assets + owedToMe;
    const owe = accounts.cardDebt + sum('debo');
    return { available: accounts.assets, owedToMe, have, owe, total: have - owe };
  }
}
