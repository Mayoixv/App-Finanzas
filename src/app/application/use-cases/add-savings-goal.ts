import { isValidCents } from '../../domain/money';
import { SavingsGoal } from '../../domain/savings';
import { isValidIsoDate } from '../../domain/month';
import { ValidationError } from '../errors';
import { IdGenerator, ISavingsRepository } from '../ports/repositories';

export interface SavingsGoalFields {
  name: string;
  targetAmount: number;
  targetDate?: string | null;
}

/** Reglas comunes al crear y al editar una meta. Devuelve el nombre ya recortado. */
export function validateGoalInput(input: SavingsGoalFields): string {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Escribe un nombre para la meta');
  if (!isValidCents(input.targetAmount)) throw new ValidationError('La meta debe ser mayor que cero');
  if (input.targetDate && !isValidIsoDate(input.targetDate)) throw new ValidationError('Fecha objetivo inválida');
  return name;
}

export class AddSavingsGoal {
  constructor(
    private readonly savings: ISavingsRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: SavingsGoalFields): Promise<SavingsGoal> {
    const goal: SavingsGoal = {
      id: this.ids.next(),
      name: validateGoalInput(input),
      targetAmount: input.targetAmount,
      targetDate: input.targetDate || null,
    };
    await this.savings.saveGoal(goal);
    return goal;
  }
}
