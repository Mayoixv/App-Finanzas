import { IRecurringExpenseRepository, ISettingsRepository, ITransactionRepository } from '../ports/repositories';

const KEY = 'onboarding_done';

/** La bienvenida se muestra una sola vez, y nunca a quien ya tiene datos (por ejemplo, tras actualizar la app). */
export class Onboarding {
  constructor(
    private readonly settings: ISettingsRepository,
    private readonly transactions: ITransactionRepository,
    private readonly recurring: IRecurringExpenseRepository,
  ) {}

  async needed(): Promise<boolean> {
    if (await this.settings.get(KEY)) return false;
    const hasData =
      (await this.transactions.listAll()).length > 0 || (await this.recurring.list()).length > 0;
    if (hasData) await this.finish();
    return !hasData;
  }

  finish(): Promise<void> {
    return this.settings.set(KEY, '1');
  }
}
