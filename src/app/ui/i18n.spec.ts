import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Dictionary } from '../application/text';
import { LANGUAGES } from './i18n';

const DIR = join(process.cwd(), 'src', 'assets', 'i18n');
const load = (code: string) => JSON.parse(readFileSync(join(DIR, `${code}.json`), 'utf8')) as Dictionary;
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Todas las claves con su valor, como "a.b.c" → texto o lista. */
function flatten(dict: Dictionary, prefix = ''): Map<string, string | string[]> {
  const out = new Map<string, string | string[]>();
  for (const [key, value] of Object.entries(dict)) {
    if (key === '_meta') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' || Array.isArray(value)) out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

describe('idiomas', () => {
  const spanish = flatten(load('es'));

  it('cada idioma del selector tiene su archivo, y no sobra ninguno', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
    expect(files).toEqual(LANGUAGES.map((l) => l.code).sort());
  });

  for (const { code } of LANGUAGES.filter((l) => l.code !== 'es')) {
    it(`${code}: tiene todas las claves del español, con los mismos {datos} y listas del mismo largo`, () => {
      const dict = load(code);
      expect(dict['_meta'], 'marcado como borrador sin revisión nativa').toBeDefined();
      const other = flatten(dict);
      const missing = [...spanish.keys()].filter((k) => !other.has(k));
      const extra = [...other.keys()].filter((k) => !spanish.has(k));
      expect(missing, 'faltan').toEqual([]);
      expect(extra, 'sobran').toEqual([]);
      for (const [key, es] of spanish) {
        const value = other.get(key)!;
        if (Array.isArray(es)) {
          expect(Array.isArray(value), key).toBe(true);
          // Las listas de palabras para importar pueden tener más o menos; las demás van una a una.
          if (!key.startsWith('import.aliases') && !key.startsWith('import.words') && key !== 'import.instructionsSheet') {
            expect((value as string[]).length, key).toBe(es.length);
          }
          continue;
        }
        expect(typeof value, key).toBe('string');
        expect(placeholders(value as string), key).toEqual(placeholders(es));
      }
    });
  }
});
