import { Category, CategoryType, isBuiltIn } from '../../domain/category';
import { NotFoundError, ValidationError } from '../errors';
import { ICategoryRepository, IdGenerator } from '../ports/repositories';

const TYPES: CategoryType[] = ['ingreso', 'fijo', 'variable'];

/** Nombre recortado, no vacío y sin repetir otro (sin distinguir mayúsculas). */
async function validName(
  name: string,
  categories: ICategoryRepository,
  exceptId?: string,
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError('Escribe un nombre para la categoría');
  const taken = (await categories.list()).some(
    (c) => c.id !== exceptId && c.name.toLocaleLowerCase('es') === trimmed.toLocaleLowerCase('es'),
  );
  if (taken) throw new ValidationError('Ya tienes una categoría con ese nombre');
  return trimmed;
}

export interface CategoryLook {
  icon?: string;
  color?: string;
}

export class AddCategory {
  constructor(
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: { name: string; type: CategoryType } & CategoryLook): Promise<Category> {
    if (!TYPES.includes(input.type)) throw new ValidationError('Tipo de categoría inválido');
    const category: Category = {
      id: this.ids.next(),
      name: await validName(input.name, this.categories),
      type: input.type,
      icon: input.icon,
      color: input.color,
    };
    await this.categories.save(category);
    return category;
  }
}

/** Cambia nombre, ícono, color u ocultarla. El tipo no cambia: alteraría el sentido de los movimientos ya registrados. */
export class UpdateCategory {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(id: string, changes: { name?: string; hidden?: boolean } & CategoryLook): Promise<Category> {
    const current = await this.categories.get(id);
    if (!current) throw new NotFoundError('Categoría');
    const updated: Category = {
      ...current,
      ...changes,
      name: changes.name === undefined ? current.name : await validName(changes.name, this.categories, id),
    };
    await this.categories.save(updated);
    return updated;
  }
}

export class DeleteCategory {
  constructor(private readonly categories: ICategoryRepository) {}

  /**
   * Las de la app no se borran (se ocultan). Una propia que se usa necesita `moveTo`: otra categoría del mismo tipo
   * que recibe sus movimientos y fijos, para que nada quede sin categoría. Sus presupuestos se borran con ella.
   */
  async execute(id: string, moveTo?: string): Promise<void> {
    const category = await this.categories.get(id);
    if (!category) throw new NotFoundError('Categoría');
    if (isBuiltIn(category)) throw new ValidationError('Las categorías de la app no se borran. Puedes ocultarla.');
    if (!(await this.categories.isInUse(id))) return this.categories.delete(id);

    if (!moveTo) throw new ValidationError('Elige a qué categoría pasar sus movimientos');
    const target = await this.categories.get(moveTo);
    if (!target || target.id === id) throw new NotFoundError('Categoría');
    if (target.type !== category.type) throw new ValidationError('Elige una categoría del mismo tipo');
    await this.categories.deleteMovingTo(id, moveTo);
  }
}
