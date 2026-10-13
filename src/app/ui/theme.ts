import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ISettingsRepository } from '../application/ports/repositories';

/** Ajustes › Apariencia. "sistema" sigue al modo del teléfono, también si cambia con la app abierta. */
export type Appearance = 'sistema' | 'claro' | 'oscuro';

const KEY = 'appearance';
const media = matchMedia('(prefers-color-scheme: dark)');
let current: Appearance = 'sistema';

export const appearance = () => current;

/** Se llama en main.ts antes de mostrar la primera pantalla, para que no parpadee el color al abrir. */
export async function loadAppearance(settings: ISettingsRepository): Promise<void> {
  const saved = await settings.get(KEY);
  current = saved === 'claro' || saved === 'oscuro' ? saved : 'sistema';
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

function apply() {
  const dark = current === 'oscuro' || (current === 'sistema' && media.matches);
  document.documentElement.classList.toggle('theme-dark', dark);
  // Íconos claros de la barra de estado sobre el fondo oscuro, y oscuros sobre el claro.
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(console.error);
  }
}
