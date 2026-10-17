import { addMonths, IsoDate, MonthKey } from '../../domain/month';
import { monthRecap, RecapFact } from '../../domain/month-recap';
import { ICategoryRepository, ITransactionRepository } from '../ports/repositories';
import { GetMonthHistory } from './get-month-history';

/** "Tu mes en 30 segundos": los datos curiosos de un mes, listos para mostrar en tarjetas. */
export class GetMonthRecap {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly history: GetMonthHistory,
  ) {}

  async execute(month: MonthKey, today: IsoDate): Promise<RecapFact[]> {
    const [current, previous, categories, history] = await Promise.all([
      this.transactions.listByMonth(month),
      this.transactions.listByMonth(addMonths(month, -1)),
      this.categories.list(),
      this.history.execute(month, 12),
    ]);
    return monthRecap(month, current, previous, categories, history, today);
  }
}
