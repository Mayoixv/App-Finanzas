import { computed, signal } from '@angular/core';
import { ISettingsRepository } from '../application/ports/repositories';
import { AppError } from '../application/errors';
import { Dictionary, interpolate, lookup, SPANISH, TextParams } from '../application/text';
import { DefaultNames } from '../application/use-cases/localize-defaults';

/**
 * Textos de la interfaz en el idioma elegido. Los textos viven en src/assets/i18n/<idioma>.json; el español va
 * dentro de la app y los demás se cargan al elegirlos. Si a un idioma le falta una clave, se usa la del español.
 * `t()` lee una señal: las plantillas que la usan se redibujan solas al cambiar de idioma, sin reiniciar.
 */
export type Lang = 'es' | 'en' | 'pt' | 'fr' | 'it' | 'ja';

export interface Language {
  code: Lang;
  /** El nombre en su propio idioma, como se muestra en el selector. */
  label: string;
  /** Para fechas y números con Intl. */
  locale: string;
}

export const LANGUAGES: Language[] = [
  { code: 'es', label: 'Español', locale: 'es-DO' },
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'pt', label: 'Português', locale: 'pt-BR' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
  { code: 'it', label: 'Italiano', locale: 'it-IT' },
  { code: 'ja', label: '日本語', locale: 'ja-JP' },
];

/** El español va dentro de la app; los demás se cargan (un archivo aparte) solo al elegirlos. */
const LOADERS: Record<Lang, () => Promise<Dictionary>> = {
  es: async () => SPANISH,
  en: () => import('../../assets/i18n/en.json').then((m) => m.default as Dictionary),
  pt: () => import('../../assets/i18n/pt.json').then((m) => m.default as Dictionary),
  fr: () => import('../../assets/i18n/fr.json').then((m) => m.default as Dictionary),
  it: () => import('../../assets/i18n/it.json').then((m) => m.default as Dictionary),
  ja: () => import('../../assets/i18n/ja.json').then((m) => m.default as Dictionary),
};

const KEY = 'language';
const current = signal<Lang>('es');
const dict = signal<Dictionary>(SPANISH);

export const language = current.asReadonly();
export const locale = computed(() => LANGUAGES.find((l) => l.code === current())?.locale ?? 'es-DO');

export function t(key: string, params?: TextParams): string {
  const value = lookup(dict(), key) ?? lookup(SPANISH, key);
  return typeof value === 'string' ? interpolate(value, params) : key;
}

/** Listas de textos (viñetas de ayuda, por ejemplo). */
export function tList(key: string): string[] {
  const value = lookup(dict(), key) ?? lookup(SPANISH, key);
  return Array.isArray(value) ? value : [];
}

/** Singular o plural según `count`: busca key.one / key.other (y las demás formas de Intl.PluralRules). */
export function tn(key: string, count: number, params?: TextParams): string {
  const form = new Intl.PluralRules(locale()).select(count);
  const exists = (lookup(dict(), `${key}.${form}`) ?? lookup(SPANISH, `${key}.${form}`)) !== undefined;
  const value = exists ? `${key}.${form}` : `${key}.other`;
  return t(value, { count, ...params });
}

/** "Comida, Luz y Agua" en el idioma actual. */
export function listText(items: string[]): string {
  return new Intl.ListFormat(locale(), { type: 'conjunction' }).format(items);
}

/** Nombres de las categorías de la app y de Efectivo en el idioma actual (para traducirlas al cambiar de idioma). */
export function defaultNames(dictionary: Dictionary = dict()): DefaultNames {
  const categories = lookup(dictionary, 'defaults.categories') ?? lookup(SPANISH, 'defaults.categories');
  const cash = lookup(dictionary, 'defaults.cash') ?? lookup(SPANISH, 'defaults.cash');
  return { categories: categories as Record<string, string>, cash: cash as string };
}

export const spanishNames = () => defaultNames(SPANISH);

/** El texto de un error de la app en el idioma actual; para fallos inesperados, `fallbackKey`. */
export function errorText(error: unknown, fallbackKey = 'common.tryAgain'): string {
  return error instanceof AppError ? t(error.key, error.params) : t(fallbackKey);
}

function pick(code: string | null | undefined): Lang | undefined {
  const short = code?.slice(0, 2).toLowerCase();
  return LANGUAGES.find((l) => l.code === short)?.code;
}

/** En main.ts, antes de la primera pantalla: el idioma guardado, si no el del teléfono, si no español. */
export async function loadLanguage(settings: ISettingsRepository): Promise<void> {
  await apply(pick(await settings.get(KEY)) ?? pick(navigator.language) ?? 'es');
}

export async function setLanguage(settings: ISettingsRepository, code: Lang): Promise<void> {
  await apply(code);
  await settings.set(KEY, code);
}

/** Cambia el idioma en pantalla sin guardarlo (preguntas iniciales: se guarda al confirmar). */
export function previewLanguage(code: Lang): Promise<void> {
  return apply(code);
}

async function apply(code: Lang) {
  dict.set(await LOADERS[code]());
  current.set(code);
  document.documentElement.lang = code;
}
