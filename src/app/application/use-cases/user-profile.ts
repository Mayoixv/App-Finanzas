import { Cents, isValidCents } from '../../domain/money';
import { ValidationError } from '../errors';
import { ISettingsRepository } from '../ports/repositories';

const MAX = 40;

/** Para qué usa la app: decide qué se resalta primero en Inicio y en el recorrido. */
export type OnboardingGoal = 'controlar' | 'ahorrar' | 'deudas' | 'organizar';
export const GOALS: OnboardingGoal[] = ['controlar', 'ahorrar', 'deudas', 'organizar'];

function clean(text: string): string {
  const value = text.trim().replace(/\s+/g, ' ');
  if (value.length > MAX) throw new ValidationError('nameLength', { max: MAX });
  return value;
}

/** Datos de la persona, solo en el teléfono: nombre para saludarla, objetivo y gasto máximo al mes. */
export class UserProfile {
  constructor(private readonly settings: ISettingsRepository) {}

  async name(): Promise<string> {
    return (await this.settings.get('user_name')) ?? '';
  }

  async setName(name: string): Promise<string> {
    const value = clean(name);
    await this.settings.set('user_name', value);
    return value;
  }

  async lastName(): Promise<string> {
    return (await this.settings.get('user_last_name')) ?? '';
  }

  async setLastName(name: string): Promise<string> {
    const value = clean(name);
    await this.settings.set('user_last_name', value);
    return value;
  }

  async goal(): Promise<OnboardingGoal | null> {
    const saved = await this.settings.get('user_goal');
    return GOALS.find((g) => g === saved) ?? null;
  }

  async setGoal(goal: OnboardingGoal | null): Promise<void> {
    await this.settings.set('user_goal', goal ?? '');
  }

  /** Gasto máximo al mes que la persona se puso al empezar; null si no lo dio. */
  async monthlyLimit(): Promise<Cents | null> {
    const value = Number(await this.settings.get('user_monthly_limit'));
    return isValidCents(value) ? value : null;
  }

  async setMonthlyLimit(limit: Cents | null): Promise<void> {
    if (limit !== null && !isValidCents(limit)) throw new ValidationError('amountPositive');
    await this.settings.set('user_monthly_limit', limit === null ? '' : String(limit));
  }

  /** A quien ya usaba la app se le pide el nombre una sola vez (puede omitirlo). */
  async nameAsked(): Promise<boolean> {
    return !!(await this.settings.get('user_name_asked'));
  }

  markNameAsked(): Promise<void> {
    return this.settings.set('user_name_asked', '1');
  }
}
