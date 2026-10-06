import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Durante las pruebas en el navegador se expone el contenedor en window.__c; nunca debe llegar a una versión,
// porque daría acceso a todos los datos (y a quitar el PIN) desde la consola.
describe('versión limpia', () => {
  it('main.ts no expone el contenedor de la app en window', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8');
    expect(main).not.toContain('__c');
  });
});
