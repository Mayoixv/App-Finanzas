import { isExpenseType } from '../../domain/category';
import { isValidIsoDate } from '../../domain/month';
import { NotFoundError, ValidationError } from '../errors';
import { ICategoryRepository, ITransactionRepository } from '../ports/repositories';

export interface BulkChange {
  categoryId?: string;
  date?: string;
}

/**
 * Cambia la categoría o la fecha de varios movimientos. Se saltan (y se cuentan) los que no admiten
 * el cambio: los divididos al cambiar de categoría y los de otro tipo (un ingreso no pasa a gasto).
 */
export class BulkUpdateTransactions {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
  ) {}

  async execute(ids: string[], change: BulkChange): Promise<{ updated: number; skipped: number }> {
    if (change.date !== undefined && !isValidIsoDate(change.date)) throw new ValidationError('date');
    const target = change.categoryId ? await this.categories.get(change.categoryId) : undefined;
    if (change.categoryId && !target) throw new NotFoundError('category');

    let updated = 0;
    let skipped = 0;
    for (const id of ids) {
      const t = await this.transactions.get(id);
      if (!t) continue;
      if (target) {
        const current = await this.categories.get(t.categoryId);
        const sameKind = current && isExpenseType(current.type) === isExpenseType(target.type);
        if (t.splits?.length || !sameKind) {
          skipped++;
          continue;
        }
      }
      await this.transactions.save({
        ...t,
        categoryId: target?.id ?? t.categoryId,
        date: change.date ?? t.date,
      });
      updated++;
    }
    return { updated, skipped };
  }
}
