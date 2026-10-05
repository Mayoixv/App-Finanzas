import { isValidCents } from '../../domain/money';
import { SavingsGoal } from '../../domain/savings';
import { ValidationError } from '../errors';
import { IdGenerator, ISavingsRepository } from '../ports/repositories';

export interface SavingsGoalFields {
  name: string;
  targetAmount: number;
}

/** Reglas comunes al crear y al editar una meta. Devuelve el nombre ya recortado. */
export function validateGoalInput(input: SavingsGoalFields): string {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Escribe un nombre para la meta');
  if (!isValidCents(input.targetAmount)) throw new ValidationError('La meta debe ser mayor que cero');
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
    };
    await this.savings.saveGoal(goal);
    return goal;
  }
}
