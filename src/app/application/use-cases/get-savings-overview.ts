import { addMonths, MonthKey, monthOf, monthsBetween } from '../../domain/month';
import { SavingsContribution, SavingsGoal, signedAmount } from '../../domain/savings';
import { ISavingsRepository } from '../ports/repositories';

/** Meses que se promedian para proyectar cuándo se llega a la meta. */
const PROJECTION_MONTHS = 3;

export interface GoalProgress {
  goal: SavingsGoal;
  /** Ahorrado hasta el final del mes consultado (no cuenta movimientos de meses posteriores). */
  saved: number;
  percent: number;
  savedThisMonth: number;
  reached: boolean;
  /** Promedio mensual neto de los últimos 3 meses (puede ser 0 o negativo). */
  monthlyAverage: number;
  /** Mes en que se llegaría al ritmo actual; null si ya se llegó o el ritmo no alcanza. */
  projectedMonth: MonthKey | null;
  /** Cuánto aportar por mes, desde este, para llegar a la fecha objetivo; null sin fecha o ya cumplida. */
  neededPerMonth: number | null;
  targetPassed: boolean;
}

export interface MonthContribution {
  contribution: SavingsContribution;
  goalName: string;
}

export interface SavingsOverview {
  goals: GoalProgress[];
  monthContributions: MonthContribution[];
  /** Neto del mes: aportes menos retiros. */
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
    const recentFrom = addMonths(month, -(PROJECTION_MONTHS - 1));
    const sum = (list: SavingsContribution[]) => list.reduce((s, c) => s + signedAmount(c), 0);
    const names = new Map(goals.map((g) => [g.id, g.name]));

    return {
      goals: goals.map((goal) => {
        const mine = upToMonth.filter((c) => c.goalId === goal.id);
        const saved = sum(mine);
        const reached = saved >= goal.targetAmount;
        const remaining = goal.targetAmount - saved;
        const monthlyAverage = Math.round(
          sum(mine.filter((c) => monthOf(c.date) >= recentFrom)) / PROJECTION_MONTHS,
        );
        const targetMonth = goal.targetDate ? monthOf(goal.targetDate) : null;
        const monthsLeft = targetMonth ? monthsBetween(month, targetMonth) + 1 : 0;
        return {
          goal,
          saved,
          percent: goal.targetAmount > 0 ? (saved / goal.targetAmount) * 100 : 0,
          savedThisMonth: sum(mine.filter((c) => monthOf(c.date) === month)),
          reached,
          monthlyAverage,
          projectedMonth:
            !reached && monthlyAverage > 0 ? addMonths(month, Math.ceil(remaining / monthlyAverage) - 1) : null,
          neededPerMonth: targetMonth && !reached && monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : null,
          targetPassed: !!targetMonth && !reached && monthsLeft <= 0,
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
