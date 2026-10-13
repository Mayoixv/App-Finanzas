/**
 * Paletas de color (Ajustes › Apariencia › Color). De un solo color de acento se genera la escala de la marca
 * (--violet-200…900, degradado, brillo, --accent) y las superficies teñidas con su tono, en claro y en oscuro.
 * Violeta es la paleta de design.md: no genera nada y deja los valores de variables.scss tal cual.
 * Los colores de estado (Recibido, Pagado, Pendiente, Vencido) y los de positivo/negativo no cambian nunca.
 */

export interface PalettePreset {
  id: string;
  /** Color de los botones llenos (--violet-600 de la paleta). */
  accent: string;
}

export const DEFAULT_PALETTE = 'violeta';

export const PRESETS: PalettePreset[] = [
  { id: 'violeta', accent: '#6639ec' },
  { id: 'oceano', accent: '#0b5fc4' },
  { id: 'turquesa', accent: '#0b6f80' },
  { id: 'fucsia', accent: '#b0237a' },
  { id: 'grafito', accent: '#4a5263' },
];

type Rgb = [number, number, number];
type Hsl = [number, number, number];

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: Rgb) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function rgbToHsl([r, g, b]: Rgb): Hsl {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslToRgb([h, s, l]: Hsl): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const hsl = (h: number, s: number, l: number) => toHex(hslToRgb([h, s, l]));

function luminance([r, g, b]: Rgb): number {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Contraste WCAG entre dos colores hex (1 a 21). */
export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(hexToRgb(a)!), luminance(hexToRgb(b)!)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

/** Mueve la luminosidad (oscurece o aclara) hasta que `color` llegue a 4.5:1 contra `against`. */
function reach(h: number, s: number, l: number, against: string, direction: -1 | 1): number {
  let out = Math.min(Math.max(l, 2), 98);
  while (contrast(hsl(h, s, out), against) < 4.5 && out > 0 && out < 100) out += direction;
  return out;
}

export interface Palette {
  light: Record<string, string>;
  dark: Record<string, string>;
  /** El acento se oscureció para que el texto se lea: se avisa al elegir un color propio. */
  adjusted: boolean;
  /** Colores de estado con que se confunde (positive, negative, warning), si alguno. */
  clashes: string[];
}

/** Tonos de los colores que significan algo: si el acento se les parece, se avisa. */
const STATUS_HUES: Record<string, number> = { positive: 151, negative: 350, warning: 36 };

export function generatePalette(accent: string): Palette {
  const [h, s0, l0] = rgbToHsl(hexToRgb(accent) ?? hexToRgb(PRESETS[0].accent)!);
  // Colores muy grises se quedan grises; el resto, con saturación suficiente para que se note la marca.
  const s = s0 < 12 ? s0 : Math.max(s0, 45);
  const tint = s < 12 ? s : 40;
  const surface = hsl(h, Math.min(tint, 30), 90);
  const card = hsl(h, Math.min(tint, 41), 94);
  const darkCard = hsl(h, tint, 16);
  const ink950 = hsl(h, Math.min(tint, 30), 5.5);
  // 600: texto blanco encima y, como texto, legible sobre las superficies claras.
  const l600 = Math.min(reach(h, s, l0, '#ffffff', -1), reach(h, s, l0, surface, -1), reach(h, s, l0, card, -1));
  const adjusted = l600 < l0 - 0.5;
  const c600 = hsl(h, s, l600);
  const c400 = hsl(h, Math.min(100, s + 10), Math.min(l600 + 14, 72));
  const c700 = hsl(h, s, Math.max(l600 - 10, 12));
  const c900 = hsl(h, s, Math.max(l600 - 26, 8));
  // Texto de acento sobre lo oscuro: claro hasta llegar a 4.5:1 sobre la tarjeta oscura.
  const s200 = Math.min(100, s + 15);
  const c200 = hsl(h, s200, reach(h, s200, 80, darkCard, 1));
  const grey = (max: number) => Math.min(tint, max);
  const rgb = (hex: string) => hexToRgb(hex)!.map(Math.round).join(', ');
  const shared: Record<string, string> = {
    '--violet-600': c600,
    '--violet-400': c400,
    '--violet-200': c200,
    '--violet-700': c700,
    '--violet-900': c900,
    '--violet-600-rgb': rgb(c600),
    '--violet-400-rgb': rgb(c400),
    '--ink-950': ink950,
    '--ink-800': hsl(h, grey(20), 11),
    '--muted': hsl(h, grey(14), reach(h, grey(14), 62, hsl(h, grey(20), 11), 1)),
    ...derived(c400, rgb(c600), rgb(c400), c900),
  };
  const light = {
    ...shared,
    '--surface-soft': surface,
    '--surface-soft-card': card,
    '--surface-soft-chip': hsl(h, grey(57), 97),
    '--lavender-100': hsl(h, grey(100), 96),
    '--muted-on-light': hsl(h, grey(14), reach(h, grey(14), 42, card, -1)),
    '--accent': c600,
  };
  const dark = {
    ...shared,
    '--surface-soft': hsl(h, grey(44), 10),
    '--surface-soft-card': darkCard,
    '--surface-soft-chip': hsl(h, grey(39), 22.5),
    '--paper': darkCard,
    '--lavender-100': hsl(h, grey(39), 22.5),
    '--muted-on-light': hsl(h, grey(25), reach(h, grey(25), 72, darkCard, 1)),
    '--accent': c200,
  };
  const clashes =
    s < 25 ? [] : Object.entries(STATUS_HUES).filter(([, hue]) => Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue)) < 22).map(([k]) => k);
  return { light, dark, adjusted, clashes };
}

/**
 * Tokens que se calculan con var() en variables.scss: dentro de un elemento con otra paleta (la vista previa) no se
 * recalculan solos, así que van también explícitos.
 */
function derived(c400: string, rgb600: string, rgb400: string, c900: string): Record<string, string> {
  return {
    '--brand-gradient': `linear-gradient(160deg, ${c400} 0%, rgb(${rgb600}) 45%, ${c900} 100%)`,
    '--brand-glow': `radial-gradient(circle at 50% 0%, rgba(${rgb400}, 0.55), transparent 65%)`,
    '--border-glow': `rgba(${rgb400}, 0.25)`,
  };
}

/** La paleta de la marca tal como está en variables.scss, solo para la vista previa. */
const BRAND_SHARED: Record<string, string> = {
  '--violet-600': '#6639ec',
  '--violet-400': '#8f6bff',
  '--violet-200': '#c9b8ff',
  '--violet-700': '#4b25c4',
  '--violet-900': '#2a1478',
  '--violet-600-rgb': '106, 61, 240',
  '--violet-400-rgb': '143, 107, 255',
  '--ink-950': '#0a0a12',
  '--ink-800': '#171722',
  '--muted': '#928eac',
  ...derived('#8f6bff', '106, 61, 240', '143, 107, 255', '#2a1478'),
};
export const BRAND = {
  light: {
    ...BRAND_SHARED,
    '--surface-soft': '#e2deee',
    '--surface-soft-card': '#ece9f6',
    '--surface-soft-chip': '#f6f4fc',
    '--lavender-100': '#efeaff',
    '--muted-on-light': '#5f5b7a',
    '--accent': '#6639ec',
  },
  dark: {
    ...BRAND_SHARED,
    '--surface-soft': '#120e24',
    '--surface-soft-card': '#1d1838',
    '--surface-soft-chip': '#2a2350',
    '--paper': '#1d1838',
    '--lavender-100': '#2a2350',
    '--muted-on-light': '#aaa4c8',
    '--accent': '#b49dff',
  },
};

/** Color guardado en Ajustes: id de una paleta o un hex propio. */
export function accentOf(saved: string | null | undefined): string {
  if (saved && hexToRgb(saved)) return saved;
  return PRESETS.find((p) => p.id === saved)?.accent ?? PRESETS[0].accent;
}
