import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ISettingsRepository } from '../application/ports/repositories';
import { accentOf, BRAND, DEFAULT_PALETTE, generatePalette } from './palette';

/** Ajustes › Apariencia. "sistema" sigue al modo del teléfono, también si cambia con la app abierta. */
export type Appearance = 'sistema' | 'claro' | 'oscuro';

const KEY = 'appearance';
const PALETTE_KEY = 'palette';
const media = matchMedia('(prefers-color-scheme: dark)');
let current: Appearance = 'sistema';
/** Id de una paleta (palette.ts) o un color propio en hex. */
let palette = DEFAULT_PALETTE;
/** Variables puestas por la paleta, para quitarlas al cambiarla. */
let applied: string[] = [];

export const appearance = () => current;
export const currentPalette = () => palette;

/** Se llama en main.ts antes de mostrar la primera pantalla, para que no parpadee el color al abrir. */
export async function loadAppearance(settings: ISettingsRepository): Promise<void> {
  const saved = await settings.get(KEY);
  current = saved === 'claro' || saved === 'oscuro' ? saved : 'sistema';
  palette = (await settings.get(PALETTE_KEY)) || DEFAULT_PALETTE;
  apply();
  media.addEventListener('change', () => {
    if (current === 'sistema') apply();
  });
}

export async function setAppearance(settings: ISettingsRepository, value: Appearance): Promise<void> {
  current = value;
  apply();
  await settings.set(KEY, value);
}

export async function setPalette(settings: ISettingsRepository, value: string): Promise<void> {
  palette = value;
  apply();
  await settings.set(PALETTE_KEY, value);
}

export const isDark = () => current === 'oscuro' || (current === 'sistema' && media.matches);

/**
 * Variables de una paleta para el modo actual. La de la marca no pone ninguna en la app (usa variables.scss);
 * con `preview`, devuelve sus valores para pintarla dentro de la vista previa.
 */
export function paletteVars(value: string, dark = isDark(), preview = false): Record<string, string> {
  if (value === DEFAULT_PALETTE) return preview ? (dark ? BRAND.dark : BRAND.light) : {};
  const generated = generatePalette(accentOf(value));
  return dark ? generated.dark : generated.light;
}

function apply() {
  const dark = isDark();
  const root = document.documentElement;
  root.classList.toggle('theme-dark', dark);
  for (const name of applied) root.style.removeProperty(name);
  const vars = paletteVars(palette, dark);
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  applied = Object.keys(vars);
  // Íconos claros de la barra de estado sobre el fondo oscuro, y oscuros sobre el claro.
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(console.error);
  }
}
