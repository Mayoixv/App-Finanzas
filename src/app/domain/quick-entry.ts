import { Category } from './category';
import { Cents } from './money';

/** Lo que se entendió de una frase como "gasté 500 en gasolina". Lo que no se entendió queda en null. */
export interface QuickEntry {
  amount: Cents | null;
  kind: 'gasto' | 'ingreso' | null;
  categoryId: string | null;
  note: string;
}

/** Palabras que apuntan a las categorías de la app (por su id, que no cambia con el idioma). */
const KEYWORDS: Record<string, string[]> = {
  'cat-salario': ['sueldo', 'salario', 'quincena', 'nomina', 'salary', 'paycheck'],
  'cat-comida': ['comida', 'almuerzo', 'cena', 'desayuno', 'restaurante', 'pizza', 'pollo', 'empanada', 'yaroa', 'chimi', 'cafe', 'food', 'lunch', 'dinner'],
  'cat-supermercado': ['super', 'supermercado', 'colmado', 'compra', 'jumbo', 'sirena', 'nacional', 'bravo', 'groceries'],
  'cat-transporte': ['uber', 'taxi', 'guagua', 'carrito', 'concho', 'motoconcho', 'pasaje', 'metro', 'peaje', 'parqueo'],
  'cat-gasolina': ['gasolina', 'combustible', 'gasoil', 'diesel', 'gas', 'bomba'],
  'cat-luz': ['luz', 'edesur', 'edenorte', 'edeeste', 'electricidad'],
  'cat-agua': ['agua', 'caasd', 'botellon'],
  'cat-internet': ['internet', 'cable', 'wifi'],
  'cat-telefono': ['telefono', 'celular', 'recarga', 'claro', 'altice', 'viva'],
  'cat-salud': ['farmacia', 'medicina', 'doctor', 'medico', 'clinica', 'consulta', 'pastillas'],
  'cat-ocio': ['cine', 'fiesta', 'bar', 'cerveza', 'romo', 'salida', 'concierto', 'playa'],
  'cat-suscripciones': ['netflix', 'spotify', 'disney', 'youtube', 'hbo', 'suscripcion', 'prime'],
  'cat-ropa': ['ropa', 'zapatos', 'tenis', 'camisa', 'pantalon', 'vestido'],
  'cat-hogar': ['hogar', 'casa', 'mueble', 'ferreteria', 'limpieza'],
  'cat-educacion': ['colegio', 'universidad', 'libro', 'libros', 'curso', 'inscripcion', 'matricula'],
  'cat-alquiler': ['alquiler', 'renta', 'rent'],
  'cat-seguros': ['seguro', 'ars', 'poliza'],
  'cat-pago-deudas': ['prestamo', 'deuda', 'cuota', 'tarjeta'],
};

const INCOME = /\b(cobre|me pagaron|me pago|recibi|me depositaron|me transfirieron|gane|vendi|ingreso|got paid|received|earned)\b/;
/** Palabras de relleno que no van en la nota. */
const FILLER = new Set(
  'gaste pague compre cobre recibi gane vendi me pagaron pago depositaron transfirieron en de del por para el la los las un una al y con pesos peso dolares dolar rd us spent paid bought on for at the a'.split(' '),
);

const plain = (s: string) => s.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** "1,500" / "1.500" / "1500.50" / "2k" / "5 mil" / "mil" a centavos. Coma o punto seguidos de 3 cifras son miles. */
function findAmount(text: string): { cents: Cents; match: string } | null {
  const m = /(?:rd\$|us\$|\$)?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?(?!\d)\s*(k\b|mil\b)?/.exec(text);
  if (m) {
    const whole = Number(m[1].replace(/[.,]/g, ''));
    const cents = whole * 100 + Number((m[2] ?? '').padEnd(2, '0'));
    return { cents: m[3] ? cents * 1000 : cents, match: m[0] };
  }
  const mil = /\bmil\b/.exec(text);
  return mil ? { cents: 100_000, match: mil[0] } : null;
}

/**
 * Entiende una frase escrita o dictada: monto, si es gasto o ingreso, categoría y nota.
 * La categoría sale, en orden, del nombre de una categoría dicho en la frase, de notas anteriores con la misma
 * palabra, o de las palabras clave de las categorías de la app.
 * ponytail: las palabras clave y de relleno están en español e inglés; agregar más idiomas si se usan.
 */
export function parseQuickEntry(
  text: string,
  categories: Category[],
  history: { note: string; categoryId: string }[] = [],
): QuickEntry {
  const lower = plain(text.trim());
  const found = findAmount(lower);
  const rest = found ? lower.replace(found.match, ' ') : lower;
  const words = rest.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const visible = categories.filter((c) => !c.hidden);

  const byName = visible
    .filter((c) => new RegExp(`(^|\\s)${escape(plain(c.name))}(\\s|$)`).test(words.join(' ')))
    .sort((a, b) => b.name.length - a.name.length)[0];
  const learned = byName ? undefined : fromHistory(words, history, visible);
  const byKeyword = byName || learned ? undefined : visible.find((c) => KEYWORDS[c.id]?.some((k) => words.includes(k)));
  const category = byName ?? learned ?? byKeyword;

  const kind = category ? (category.type === 'ingreso' ? 'ingreso' : 'gasto') : INCOME.test(lower) ? 'ingreso' : found ? 'gasto' : null;
  const token = (w: string) => plain(w).replace(/[^\p{L}\p{N}$]/gu, '');
  const amountWords = new Set(found?.match.split(/\s+/).map(token));
  const original = text
    .trim()
    .split(/\s+/)
    .filter((w) => token(w) && !FILLER.has(token(w)) && !amountWords.has(token(w)))
    .join(' ');
  return {
    amount: found?.cents || null,
    kind,
    categoryId: category?.id ?? null,
    note: original.charAt(0).toLocaleUpperCase() + original.slice(1),
  };
}

/** La categoría que más se usó con alguna de estas palabras en la nota (de 4 letras o más). */
function fromHistory(words: string[], history: { note: string; categoryId: string }[], categories: Category[]): Category | undefined {
  const wanted = new Set(words.filter((w) => w.length >= 4 && !FILLER.has(w)));
  const counts = new Map<string, number>();
  for (const h of history) {
    if (plain(h.note).split(/[^\p{L}\p{N}]+/u).some((w) => wanted.has(w))) counts.set(h.categoryId, (counts.get(h.categoryId) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? categories.find((c) => c.id === best[0]) : undefined;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
