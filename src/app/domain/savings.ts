import { IsoDate } from './month';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  date: IsoDate;
  amount: number;
}

export function goalProgress(
  goal: SavingsGoal,
  contributions: SavingsContribution[],
): { saved: number; percent: number } {
  const saved = contributions
    .filter((c) => c.goalId === goal.id)
    .reduce((sum, c) => sum + c.amount, 0);
  const percent = goal.targetAmount > 0 ? (saved / goal.targetAmount) * 100 : 0;
  return { saved, percent };
}
