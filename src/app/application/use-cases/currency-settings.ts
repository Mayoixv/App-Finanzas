import { Currency, isCurrency } from '../../domain/currency';
import { ValidationError } from '../errors';
import { ISettingsRepository } from '../ports/repositories';

const KEY = 'currency';
const DEFAULT: Currency = 'DOP';

export class CurrencySettings {
  constructor(private readonly settings: ISettingsRepository) {}

  async get(): Promise<Currency> {
    const stored = await this.settings.get(KEY);
    return isCurrency(stored) ? stored : DEFAULT;
  }

  async set(currency: Currency): Promise<void> {
    if (!isCurrency(currency)) throw new ValidationError('currency');
    await this.settings.set(KEY, currency);
  }
}
