import { TOUR_STEPS } from '../tour/tour.service';
import { HELP, HELP_TOPICS } from './help.content';

describe('textos de ayuda', () => {
  it('máximo 3 viñetas por pantalla, y cada una cabe en 2 líneas a 360 px', () => {
    for (const topic of HELP_TOPICS) {
      const { points } = HELP[topic];
      expect(points.length, topic).toBeGreaterThan(0);
      expect(points.length, topic).toBeLessThanOrEqual(3);
      // Unos 40 caracteres por línea en la hoja de ayuda a 360 px.
      for (const p of points) expect(p.length, p).toBeLessThanOrEqual(80);
    }
  });

  it('el recorrido usa los mismos textos que la ayuda', () => {
    const all = new Set(HELP_TOPICS.flatMap((t) => HELP[t].points));
    for (const step of TOUR_STEPS) expect(all.has(step.text), step.title).toBe(true);
  });
});
