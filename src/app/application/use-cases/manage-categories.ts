import { Category, CategoryType } from '../../domain/category';
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

export class AddCategory {
  constructor(
    private readonly categories: ICategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: { name: string; type: CategoryType }): Promise<Category> {
    if (!TYPES.includes(input.type)) throw new ValidationError('Tipo de categoría inválido');
    const category: Category = {
      id: this.ids.next(),
      name: await validName(input.name, this.categories),
      type: input.type,
    };
    await this.categories.save(category);
    return category;
  }
}

/** Solo cambia el nombre: cambiar el tipo alteraría el sentido de los movimientos ya registrados. */
export class RenameCategory {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(id: string, name: string): Promise<Category> {
    const current = await this.categories.get(id);
    if (!current) throw new NotFoundError('Categoría');
    const renamed = { ...current, name: await validName(name, this.categories, id) };
    await this.categories.save(renamed);
    return renamed;
  }
}

export class DeleteCategory {
  constructor(private readonly categories: ICategoryRepository) {}

  /** Solo si nada la usa. Sus presupuestos se borran con ella. */
  async execute(id: string): Promise<void> {
    if (!(await this.categories.get(id))) throw new NotFoundError('Categoría');
    if (await this.categories.isInUse(id)) {
      throw new ValidationError(
        'Esta categoría tiene movimientos o gastos fijos. Cámbiales la categoría o bórralos antes de eliminarla.',
      );
    }
    await this.categories.delete(id);
  }
}
