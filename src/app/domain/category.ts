export type CategoryType = 'ingreso' | 'fijo' | 'variable';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  /** Nombre de un ícono de la lista de la app; sin él se usa uno genérico. */
  icon?: string;
  /** Color '#rrggbb' de la paleta de la app; sin él se usa el de su tipo. */
  color?: string;
  /** Oculta: no se ofrece al elegir, pero sus movimientos siguen igual. */
  hidden?: boolean;
}

export function isExpenseType(type: CategoryType): boolean {
  return type === 'fijo' || type === 'variable';
}

/** Las categorías que trae la app: el código usa algunas por su id, así que se ocultan pero no se borran. */
export function isBuiltIn(category: Pick<Category, 'id'>): boolean {
  return category.id.startsWith('cat-');
}
