import { NotFoundError, ValidationError } from '../errors';
import {
  InMemoryBudgets,
  InMemoryCategories,
  InMemorySavings,
  SequentialIds,
} from '../testing/in-memory';
import { InMemorySettings } from '../testing/in-memory';
import { AddSavingsContribution } from './add-savings-contribution';
import { CurrencySettings } from './currency-settings';
import { AddCategory, DeleteCategory, RenameCategory } from './manage-categories';
import { AddSavingsGoal } from './add-savings-goal';
import { CopyBudgets } from './copy-budgets';
import { DeleteSavingsGoal } from './delete-savings-goal';
import { GetSavingsOverview } from './get-savings-overview';
import { SetBudget } from './set-budget';
import { UpdateSavingsGoal } from './update-savings-goal';

function setup() {
  const savings = new InMemorySavings();
  const budgets = new InMemoryBudgets();
  const categories = new InMemoryCategories();
  const ids = new SequentialIds();
  categories.items.set('sal', { id: 'sal', name: 'Salario', type: 'ingreso' });
  categories.items.set('com', { id: 'com', name: 'Comida', type: 'variable' });
  categories.items.set('ren', { id: 'ren', name: 'Alquiler', type: 'fijo' });
  return { savings, budgets, categories, ids };
}

describe('metas de ahorro', () => {
  it('crea, valida y edita metas', async () => {
    const s = setup();
    const add = new AddSavingsGoal(s.savings, s.ids);
    const g = await add.execute({ name: ' Viaje ', targetAmount: 50000 });
    expect(g.name).toBe('Viaje');
    await expect(add.execute({ name: '', targetAmount: 10 })).rejects.toThrow(ValidationError);
    await expect(add.execute({ name: 'X', targetAmount: 0 })).rejects.toThrow(ValidationError);
    await new UpdateSavingsGoal(s.savings).execute(g.id, { name: 'Viaje a Samaná', targetAmount: 60000 });
    expect(await s.savings.getGoal(g.id)).toMatchObject({ id: g.id, name: 'Viaje a Samaná', targetAmount: 60000 });
    await expect(new UpdateSavingsGoal(s.savings).execute('nope', { name: 'a', targetAmount: 1 })).rejects.toThrow(NotFoundError);
  });

  it('el resumen cuenta el progreso hasta el mes consultado y los aportes del mes', async () => {
    const s = setup();
    const g = await new AddSavingsGoal(s.savings, s.ids).execute({ name: 'Fondo', targetAmount: 1000 });
    const aportar = new AddSavingsContribution(s.savings, s.ids);
    await aportar.execute({ goalId: g.id, date: '2026-09-10', amount: 300 });
    await aportar.execute({ goalId: g.id, date: '2026-10-05', amount: 200 });
    await aportar.execute({ goalId: g.id, date: '2026-11-01', amount: 600 });
    await expect(aportar.execute({ goalId: g.id, date: '2026-02-30', amount: 5 })).rejects.toThrow(ValidationError);

    const oct = await new GetSavingsOverview(s.savings).execute('2026-10');
    expect(oct.goals[0]).toMatchObject({ saved: 500, percent: 50, savedThisMonth: 200, reached: false });
    expect(oct.savedThisMonth).toBe(200);
    expect(oct.monthContributions.map((m) => m.goalName)).toEqual(['Fondo']);

    const nov = await new GetSavingsOverview(s.savings).execute('2026-11');
    expect(nov.goals[0]).toMatchObject({ saved: 1100, reached: true });
  });

  it('borrar una meta borra sus aportes', async () => {
    const s = setup();
    const g = await new AddSavingsGoal(s.savings, s.ids).execute({ name: 'Fondo', targetAmount: 1000 });
    await new AddSavingsContribution(s.savings, s.ids).execute({ goalId: g.id, date: '2026-10-05', amount: 200 });
    // El repositorio en memoria no tiene cascada; se simula como la base de datos.
    const realDelete = s.savings.deleteGoal.bind(s.savings);
    s.savings.deleteGoal = async (id) => {
      for (const c of await s.savings.listContributions()) if (c.goalId === id) await s.savings.deleteContribution(c.id);
      return realDelete(id);
    };
    await new DeleteSavingsGoal(s.savings).execute(g.id);
    expect(await s.savings.listGoals()).toEqual([]);
    expect(await s.savings.listContributions()).toEqual([]);
  });
});

describe('presupuestos', () => {
  it('SetBudget crea uno por categoría y mes, y si ya existe cambia el límite', async () => {
    const s = setup();
    const set = new SetBudget(s.budgets, s.categories, s.ids);
    const a = await set.execute({ categoryId: 'com', month: '2026-10', limit: 8000 });
    const b = await set.execute({ categoryId: 'com', month: '2026-10', limit: 9000 });
    expect(b.id).toBe(a.id);
    expect(await s.budgets.listByMonth('2026-10')).toEqual([b]);
  });

  it('SetBudget rechaza ingresos, límites inválidos y categorías inexistentes', async () => {
    const s = setup();
    const set = new SetBudget(s.budgets, s.categories, s.ids);
    await expect(set.execute({ categoryId: 'sal', month: '2026-10', limit: 5 })).rejects.toThrow(ValidationError);
    await expect(set.execute({ categoryId: 'com', month: '2026-10', limit: 0 })).rejects.toThrow(ValidationError);
    await expect(set.execute({ categoryId: 'x', month: '2026-10', limit: 5 })).rejects.toThrow(NotFoundError);
  });

  it('CopyBudgets copia al mes nuevo sin pisar lo que ya tenga', async () => {
    const s = setup();
    const set = new SetBudget(s.budgets, s.categories, s.ids);
    await set.execute({ categoryId: 'com', month: '2026-09', limit: 8000 });
    await set.execute({ categoryId: 'ren', month: '2026-09', limit: 15000 });
    await set.execute({ categoryId: 'com', month: '2026-10', limit: 7000 });
    expect(await new CopyBudgets(s.budgets, s.ids).execute('2026-09', '2026-10')).toBe(1);
    const oct = await s.budgets.listByMonth('2026-10');
    expect(oct.map((b) => [b.categoryId, b.limit]).sort()).toEqual([['com', 7000], ['ren', 15000]]);
  });
});

describe('moneda', () => {
  it('por defecto es DOP, guarda la elegida e ignora valores desconocidos', async () => {
    const repo = new InMemorySettings();
    const settings = new CurrencySettings(repo);
    expect(await settings.get()).toBe('DOP');
    await settings.set('USD');
    expect(await settings.get()).toBe('USD');
    repo.values.set('currency', 'EUR');
    expect(await settings.get()).toBe('DOP');
    await expect(settings.set('EUR' as never)).rejects.toThrow(ValidationError);
  });
});

describe('centavos', () => {
  it('los casos de uso rechazan montos con fracciones de centavo', async () => {
    const s = setup();
    await expect(new AddSavingsGoal(s.savings, s.ids).execute({ name: 'X', targetAmount: 10.5 })).rejects.toThrow(ValidationError);
    await expect(new SetBudget(s.budgets, s.categories, s.ids).execute({ categoryId: 'com', month: '2026-10', limit: 0.1 })).rejects.toThrow(ValidationError);
  });
});

describe('categorías', () => {
  it('crea y renombra validando nombres vacíos y repetidos', async () => {
    const s = setup();
    const add = new AddCategory(s.categories, s.ids);
    const c = await add.execute({ name: ' Mascotas ', type: 'variable' });
    expect(c).toMatchObject({ name: 'Mascotas', type: 'variable' });
    await expect(add.execute({ name: 'comida', type: 'variable' })).rejects.toThrow('Ya tienes una categoría');
    await expect(add.execute({ name: '  ', type: 'fijo' })).rejects.toThrow(ValidationError);
    await expect(add.execute({ name: 'X', type: 'otro' as never })).rejects.toThrow(ValidationError);

    const rename = new RenameCategory(s.categories);
    await rename.execute(c.id, 'mascotas');
    expect((await s.categories.get(c.id))?.name).toBe('mascotas');
    await expect(rename.execute(c.id, 'Salario')).rejects.toThrow('Ya tienes una categoría');
  });

  it('no deja eliminar una categoría en uso', async () => {
    const s = setup();
    s.categories.inUse.add('com');
    const del = new DeleteCategory(s.categories);
    await expect(del.execute('com')).rejects.toThrow(ValidationError);
    await del.execute('ren');
    expect(await s.categories.get('ren')).toBeUndefined();
  });
});
