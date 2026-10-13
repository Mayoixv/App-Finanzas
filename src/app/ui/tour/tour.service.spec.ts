import { tourOrder } from './tour.service';

describe('recorrido', () => {
  it('pone la sección del objetivo justo después de Inicio y termina en el respaldo', () => {
    const ids = (goal: Parameters<typeof tourOrder>[0]) => tourOrder(goal).map((s) => s.id);
    expect(ids(null)).toEqual(['inicio', 'movimientos', 'fijos', 'dinero', 'metas', 'deudas', 'resumen', 'respaldo']);
    expect(ids('deudas')).toEqual(['inicio', 'deudas', 'movimientos', 'fijos', 'dinero', 'metas', 'resumen', 'respaldo']);
    expect(ids('ahorrar').slice(0, 2)).toEqual(['inicio', 'metas']);
    expect(new Set(ids('organizar')).size).toBe(8);
  });
});
