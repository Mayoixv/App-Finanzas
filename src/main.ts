import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { APP_CONTAINER, createSqliteContainer } from './app/app.container';
import { setDisplayCurrency } from './app/ui/format';

async function start() {
  const container = await createSqliteContainer();
  setDisplayCurrency(await container.currencySettings.get());
  await bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      { provide: APP_CONTAINER, useValue: container },
      provideIonicAngular(),
      provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    ],
  });
}

start().catch((error) => {
  console.error(error);
  document.body.textContent =
    'No se pudo abrir la base de datos local. Cierra y vuelve a abrir la aplicación.';
});
