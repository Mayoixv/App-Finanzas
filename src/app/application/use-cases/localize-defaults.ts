import { CASH_ACCOUNT_ID } from '../../domain/account';
import { IAccountRepository, ICategoryRepository } from '../ports/repositories';

/** Nombres de las categorías de la app (por id) y de la cuenta Efectivo en un idioma. */
export interface DefaultNames {
  categories: Record<string, string>;
  cash: string;
}

/**
 * Al cambiar de idioma, las categorías que trae la app y la cuenta Efectivo pasan al idioma nuevo, solo si la
 * persona no les cambió el nombre (siguen como en alguno de los idiomas de `from`). Nunca se pisa un nombre propio.
 */
export class LocalizeDefaultNames {
  constructor(
    private readonly categories: ICategoryRepository,
    private readonly accounts: IAccountRepository,
  ) {}

  async execute(from: DefaultNames[], to: DefaultNames): Promise<number> {
    let renamed = 0;
    const all = await this.categories.list();
    const taken = new Set(all.map((c) => c.name.toLowerCase()));
    for (const category of all) {
      const target = to.categories[category.id];
      if (!target || target === category.name || taken.has(target.toLowerCase())) continue;
      if (!from.some((names) => names.categories[category.id] === category.name)) continue;
      taken.delete(category.name.toLowerCase());
      taken.add(target.toLowerCase());
      await this.categories.save({ ...category, name: target });
      renamed++;
    }
    const cash = await this.accounts.get(CASH_ACCOUNT_ID);
    if (cash && to.cash && cash.name !== to.cash && from.some((names) => names.cash === cash.name)) {
      await this.accounts.save({ ...cash, name: to.cash });
      renamed++;
    }
    return renamed;
  }
}
