import { ValidationError } from '../errors';
import { ISettingsRepository } from '../ports/repositories';

const KEY = 'user_name';
const MAX = 40;

/** El nombre del usuario, solo para saludarlo. Vacío si no lo dio. */
export class UserProfile {
  constructor(private readonly settings: ISettingsRepository) {}

  async name(): Promise<string> {
    return (await this.settings.get(KEY)) ?? '';
  }

  async setName(name: string): Promise<string> {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length > MAX) throw new ValidationError(`El nombre puede tener hasta ${MAX} caracteres`);
    await this.settings.set(KEY, clean);
    return clean;
  }
}
