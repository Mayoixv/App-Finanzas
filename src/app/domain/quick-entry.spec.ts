import { Category } from './category';
import { parseQuickEntry } from './quick-entry';

const categories: Category[] = [
  { id: 'cat-salario', name: 'Salario', type: 'ingreso' },
  { id: 'cat-gasolina', name: 'Gasolina', type: 'variable' },
  { id: 'cat-comida', name: 'Comida', type: 'variable' },
  { id: 'cat-transporte', name: 'Transporte', type: 'variable' },
  { id: 'mia', name: 'Mascotas', type: 'variable' },
];

describe('parseQuickEntry', () => {
  it('entiende monto, categoría por nombre y nota', () => {
    expect(parseQuickEntry('Gasté 500 en gasolina', categories)).toEqual({
      amount: 50_000, kind: 'gasto', categoryId: 'cat-gasolina', note: 'Gasolina',
    });
  });

  it('quita de la nota el monto escrito con separador de miles', () => {
    expect(parseQuickEntry('Gasté 1,250 en gasolina', categories).note).toBe('Gasolina');
    expect(parseQuickEntry('RD$ 300 de comida', categories).note).toBe('Comida');
  });

  it('lee miles con coma o punto, decimales, k y mil', () => {
    const amount = (text: string) => parseQuickEntry(text, categories).amount;
    expect(amount('1,500 comida')).toBe(150_000);
    expect(amount('1.500 comida')).toBe(150_000);
    expect(amount('RD$1500.50 comida')).toBe(150_050);
    expect(amount('2k comida')).toBe(200_000);
    expect(amount('5 mil de comida')).toBe(500_000);
    expect(amount('gasté mil en comida')).toBe(100_000);
  });

  it('usa palabras clave de las categorías de la app', () => {
    const r = parseQuickEntry('uber 350', categories);
    expect(r.categoryId).toBe('cat-transporte');
    expect(r.note).toBe('Uber');
  });

  it('aprende de notas anteriores', () => {
    const r = parseQuickEntry('800 veterinario', categories, [{ note: 'Veterinario Max', categoryId: 'mia' }]);
    expect(r.categoryId).toBe('mia');
  });

  it('reconoce un ingreso aunque no sepa la categoría', () => {
    const r = parseQuickEntry('me pagaron 3000 por un trabajo', categories);
    expect(r).toEqual({ amount: 300_000, kind: 'ingreso', categoryId: null, note: 'Trabajo' });
  });

  it('sin monto lo deja en null', () => {
    expect(parseQuickEntry('comida', categories).amount).toBeNull();
  });
});
