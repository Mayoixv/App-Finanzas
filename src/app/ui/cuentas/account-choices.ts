import { AppContainer } from '../../app.container';
import { Account, CASH_ACCOUNT_ID } from '../../domain/account';

const LAST_ACCOUNT_KEY = 'last_account';

export const ACCOUNT_TYPE_LABEL: Record<Account['type'], string> = {
  efectivo: 'Efectivo',
  banco: 'Banco',
  ahorro: 'Ahorros',
  tarjeta: 'Tarjeta de crédito',
  inversion: 'Inversión',
};

/** Etiqueta para elegir la cuenta: "Visa · Tarjeta de crédito". Efectivo va solo. */
export const accountLabel = (a: Account) => (a.id === CASH_ACCOUNT_ID ? a.name : `${a.name} · ${ACCOUNT_TYPE_LABEL[a.type]}`);

/**
 * Cuentas que se pueden elegir en un formulario (las activas, más la actual aunque esté archivada)
 * y cuál proponer: la actual, si no la última usada, si no Efectivo.
 */
export async function accountChoices(
  container: AppContainer,
  currentId?: string | null,
): Promise<{ accounts: Account[]; selected: string }> {
  const all = await container.accounts.list();
  const accounts = all.filter((a) => !a.archived || a.id === currentId);
  const last = await container.settings.get(LAST_ACCOUNT_KEY);
  const usable = (id: string | null | undefined) => !!id && accounts.some((a) => a.id === id);
  const selected = usable(currentId) ? currentId! : usable(last) ? last! : CASH_ACCOUNT_ID;
  return { accounts, selected };
}

export function rememberAccount(container: AppContainer, id: string): Promise<void> {
  return container.settings.set(LAST_ACCOUNT_KEY, id);
}
