import es from '../../assets/i18n/es.json';

export type TextParams = Record<string, string | number>;
export interface Dictionary {
  [key: string]: string | string[] | Dictionary;
}

/** Busca 'a.b.c' dentro de un diccionario de textos. */
export function lookup(dict: Dictionary, key: string): string | string[] | Dictionary | undefined {
  let node: string | string[] | Dictionary | undefined = dict;
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string' || Array.isArray(node)) return undefined;
    node = node[part];
  }
  return node;
}

/** Cambia {nombre} por su valor. */
export function interpolate(text: string, params?: TextParams): string {
  return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match)) : text;
}

export const SPANISH: Dictionary = es;

/** Texto en español: el idioma base. La interfaz usa `t()` de ui/i18n, que sigue el idioma elegido. */
export function spanish(key: string, params?: TextParams): string {
  const value = lookup(SPANISH, key);
  return typeof value === 'string' ? interpolate(value, params) : key;
}
