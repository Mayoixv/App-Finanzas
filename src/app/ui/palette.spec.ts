import { accentOf, contrast, generatePalette, PRESETS } from './palette';

const hsl = (h: number, s: number, l: number) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

describe('paletas', () => {
  // Todas las paletas y colores propios de todo el círculo, saturados, apagados, claros y oscuros.
  const accents = [
    ...PRESETS.map((p) => p.accent),
    ...Array.from({ length: 36 }, (_, i) => [hsl(i * 10, 90, 55), hsl(i * 10, 30, 75), hsl(i * 10, 70, 25)]).flat(),
    '#ffffff',
    '#000000',
    '#ffff00',
  ];

  it('en claro y en oscuro, los textos y botones llegan a 4.5:1 con cualquier color', () => {
    for (const accent of accents) {
      const { light, dark } = generatePalette(accent);
      const tag = `${accent}`;
      expect(contrast('#ffffff', light['--violet-600']), tag).toBeGreaterThanOrEqual(4.5);
      expect(contrast(light['--violet-600'], light['--surface-soft']), tag).toBeGreaterThanOrEqual(4.5);
      expect(contrast(light['--muted-on-light'], light['--surface-soft-card']), tag).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#14121f', light['--surface-soft']), tag).toBeGreaterThanOrEqual(4.5);
      expect(contrast(dark['--accent'], dark['--surface-soft-card']), tag).toBeGreaterThanOrEqual(4.5);
      expect(contrast(dark['--muted-on-light'], dark['--surface-soft-card']), tag).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#f4f2ff', dark['--surface-soft-card']), tag).toBeGreaterThanOrEqual(4.5);
      expect(contrast(light['--muted'], light['--ink-950']), tag).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('avisa si el acento se parece a un color de estado y si hubo que oscurecerlo', () => {
    expect(generatePalette('#1fb26b').clashes).toContain('positive');
    expect(generatePalette('#d61f45').clashes).toContain('negative');
    expect(generatePalette(PRESETS[1].accent).clashes).toEqual([]);
    expect(generatePalette('#ffd84d').adjusted).toBe(true);
  });

  it('lo guardado puede ser una paleta o un color propio', () => {
    expect(accentOf('oceano')).toBe(PRESETS[1].accent);
    expect(accentOf('#123456')).toBe('#123456');
    expect(accentOf('cualquier cosa')).toBe(PRESETS[0].accent);
  });
});
