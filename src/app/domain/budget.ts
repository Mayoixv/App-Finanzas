import { MonthKey } from './month';

export interface Budget {
  id: string;
  /** Categoría principal; con ella se encadena el rollover entre meses. */
  categoryId: string;
  /** Más categorías que comparten el mismo límite (por ejemplo Comida y Supermercado). */
  extraCategoryIds?: string[];
  /** Nombre propio; sin él se muestran los nombres de sus categorías. */
  name?: string;
  month: MonthKey;
  limit: number;
  /** Lo que sobre (o falte) pasa al mes siguiente si ese mes también tiene rollover. */
  rollover?: boolean;
}

/** Todas las categorías del presupuesto, la principal primero. */
export function budgetCategoryIds(budget: Budget): string[] {
  return [budget.categoryId, ...(budget.extraCategoryIds ?? [])];
}

/** "Comida", "Comida y Supermercado", "Comida, Supermercado y Gasolina", o el nombre que le puso el usuario. */
/** `list` une los nombres ("Comida y Luz"); la interfaz pasa la del idioma elegido. */
export function budgetName(
  budget: Budget,
  categoryNames: Map<string, string>,
  list: (items: string[]) => string = (items: string[]) => new Intl.ListFormat('es', { type: 'conjunction' }).format(items),
): string {
  if (budget.name?.trim()) return budget.name.trim();
  return list(budgetCategoryIds(budget).map((id) => categoryNames.get(id) ?? '?'));
}

export interface BudgetStatus {
  /** Límite del mes más lo que arrastra del anterior. */
  limit: number;
  carry: number;
  spent: number;
  remaining: number;
  exceeded: boolean;
}

export function budgetStatus(budget: Budget, spent: number, carry = 0): BudgetStatus {
  const limit = budget.limit + carry;
  return { limit, carry, spent, remaining: limit - spent, exceeded: spent > limit };
}

/** Desde este porcentaje del límite el presupuesto pasa a aviso (ámbar). */
export const BUDGET_WARNING_PERCENT = 85;

export type BudgetLevel = 'ok' | 'warning' | 'exceeded';

export function budgetLevel(status: BudgetStatus): BudgetLevel {
  if (status.exceeded) return 'exceeded';
  const percent = status.limit > 0 ? (status.spent / status.limit) * 100 : status.spent > 0 ? 100 : 0;
  return percent >= BUDGET_WARNING_PERCENT ? 'warning' : 'ok';
}
