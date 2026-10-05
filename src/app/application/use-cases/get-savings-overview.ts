import { MonthKey, monthOf } from '../../domain/month';
import { SavingsContribution, SavingsGoal } from '../../domain/savings';
import { ISavingsRepository } from '../ports/repositories';

export interface GoalProgress {
  goal: SavingsGoal;
  /** Ahorrado hasta el final del mes consultado (no cuenta aportes de meses posteriores). */
  saved: number;
  percent: number;
  savedThisMonth: number;
  reached: boolean;
}

export interface MonthContribution {
  contribution: SavingsContribution;
  goalName: string;
}

export interface SavingsOverview {
  goals: GoalProgress[];
  monthContributions: MonthContribution[];
  savedThisMonth: number;
}

export class GetSavingsOverview {
  constructor(private readonly savings: ISavingsRepository) {}

  async execute(month: MonthKey): Promise<SavingsOverview> {
    const [goals, contributions] = await Promise.all([
      this.savings.listGoals(),
      this.savings.listContributions(),
    ]);
    const upToMonth = contributions.filter((c) => monthOf(c.date) <= month);
    const inMonth = contributions.filter((c) => monthOf(c.date) === month);
    const sum = (list: SavingsContribution[]) => list.reduce((s, c) => s + c.amount, 0);
    const names = new Map(goals.map((g) => [g.id, g.name]));

    return {
      goals: goals.map((goal) => {
        const saved = sum(upToMonth.filter((c) => c.goalId === goal.id));
        return {
          goal,
          saved,
          percent: goal.targetAmount > 0 ? (saved / goal.targetAmount) * 100 : 0,
          savedThisMonth: sum(inMonth.filter((c) => c.goalId === goal.id)),
          reached: saved >= goal.targetAmount,
        };
      }),
      monthContributions: [...inMonth]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((contribution) => ({
          contribution,
          goalName: names.get(contribution.goalId) ?? 'Meta eliminada',
        })),
      savedThisMonth: sum(inMonth),
    };
  }
}
