export type CategoryType = 'ingreso' | 'fijo' | 'variable';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

export function isExpenseType(type: CategoryType): boolean {
  return type === 'fijo' || type === 'variable';
}
