import { helpEntry, HELP_TOPICS } from './help.content';

describe('textos de ayuda', () => {
  it('máximo 3 viñetas por pantalla, y cada una cabe en 2 líneas a 360 px', () => {
    for (const topic of HELP_TOPICS) {
      const { points } = helpEntry(topic);
      expect(points.length, topic).toBeGreaterThan(0);
      expect(points.length, topic).toBeLessThanOrEqual(3);
      // Unos 40 caracteres por línea en la hoja de ayuda a 360 px.
      for (const p of points) expect(p.length, p).toBeLessThanOrEqual(80);
    }
  });
});
