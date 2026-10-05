import { IsoDate } from './month';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  /** Fecha para la que se quiere juntar el dinero (opcional). */
  targetDate?: IsoDate | null;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  date: IsoDate;
  /** Siempre positivo; si es un retiro, resta de la meta y del ahorrado del mes. */
  amount: number;
  withdrawal?: boolean;
}

/** Aporte en positivo, retiro en negativo. */
export const signedAmount = (c: SavingsContribution) => (c.withdrawal ? -c.amount : c.amount);

export function goalProgress(
  goal: SavingsGoal,
  contributions: SavingsContribution[],
): { saved: number; percent: number } {
  const saved = contributions
    .filter((c) => c.goalId === goal.id)
    .reduce((sum, c) => sum + signedAmount(c), 0);
  const percent = goal.targetAmount > 0 ? (saved / goal.targetAmount) * 100 : 0;
  return { saved, percent };
}
