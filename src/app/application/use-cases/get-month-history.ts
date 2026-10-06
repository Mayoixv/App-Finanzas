import { addMonths, MonthKey } from '../../domain/month';
import { MonthlySummary, summarizeMonth } from '../../domain/monthly-summary';
import { ICategoryRepository, ISavingsRepository, ITransactionRepository } from '../ports/repositories';

/** Resumen de los últimos meses hasta `month` inclusive, del más reciente al más antiguo. */
export class GetMonthHistory {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly savings: ISavingsRepository,
  ) {}

  async execute(month: MonthKey, count = 6): Promise<MonthlySummary[]> {
    const categories = await this.categories.list();
    const months = Array.from({ length: count }, (_, i) => addMonths(month, -i));
    return Promise.all(
      months.map(async (m) => {
        const [transactions, contributions] = await Promise.all([
          this.transactions.listByMonth(m),
          this.savings.listContributionsByMonth(m),
        ]);
        return summarizeMonth(m, transactions, categories, contributions);
      }),
    );
  }
}
