import { APP_VERSION } from '../../version';
import { CHANGELOG } from './changelog';
import { pointsSince } from './news.service';

describe('novedades', () => {
  it('la versión instalada tiene sus novedades escritas', () => {
    expect(CHANGELOG[0].version).toBe(APP_VERSION);
  });

  it('muestra lo de todas las versiones que se saltaron, sin repetir lo que ya se vio', () => {
    expect(pointsSince(APP_VERSION)).toEqual([]);
    expect(pointsSince(CHANGELOG[1].version)).toEqual(CHANGELOG[0].points);
    expect(pointsSince(CHANGELOG[2].version)).toEqual([...CHANGELOG[0].points, ...CHANGELOG[1].points]);
    // Sin registro previo, solo lo de la versión instalada.
    expect(pointsSince(null)).toEqual(CHANGELOG[0].points);
  });
});
