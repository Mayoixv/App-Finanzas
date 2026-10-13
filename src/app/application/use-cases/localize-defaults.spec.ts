import { CASH_ACCOUNT_ID } from '../../domain/account';
import { InMemoryAccounts, InMemoryCategories, InMemoryTransactions } from '../testing/in-memory';
import { DefaultNames, LocalizeDefaultNames } from './localize-defaults';

const ES: DefaultNames = { categories: { 'cat-comida': 'Comida', 'cat-ocio': 'Ocio', 'cat-ropa': 'Ropa' }, cash: 'Efectivo' };
const EN: DefaultNames = { categories: { 'cat-comida': 'Food', 'cat-ocio': 'Leisure', 'cat-ropa': 'Clothes' }, cash: 'Cash' };

describe('nombres de la app al cambiar de idioma', () => {
  it('traduce las categorías y Efectivo que siguen con su nombre, y no toca los que cambió la persona', async () => {
    const categories = new InMemoryCategories();
    categories.items.set('cat-comida', { id: 'cat-comida', name: 'Comida', type: 'variable' });
    categories.items.set('cat-ocio', { id: 'cat-ocio', name: 'Salidas', type: 'variable' });
    categories.items.set('cat-ropa', { id: 'cat-ropa', name: 'Ropa', type: 'variable' });
    categories.items.set('mia', { id: 'mia', name: 'Clothes', type: 'variable' });
    const accounts = new InMemoryAccounts(new InMemoryTransactions(), categories);
    const localize = new LocalizeDefaultNames(categories, accounts);

    expect(await localize.execute([ES], EN)).toBe(2);
    expect(categories.items.get('cat-comida')!.name).toBe('Food');
    expect(categories.items.get('cat-ocio')!.name).toBe('Salidas');
    // "Clothes" ya lo usa una categoría propia: no se repite el nombre.
    expect(categories.items.get('cat-ropa')!.name).toBe('Ropa');
    expect(accounts.items.get(CASH_ACCOUNT_ID)!.name).toBe('Cash');

    // Y de vuelta al español.
    await localize.execute([EN, ES], ES);
    expect(categories.items.get('cat-comida')!.name).toBe('Comida');
    expect(accounts.items.get(CASH_ACCOUNT_ID)!.name).toBe('Efectivo');
  });
});
