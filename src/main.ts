import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { APP_CONTAINER, createSqliteContainer } from './app/app.container';
import { setDisplayCurrency } from './app/ui/format';
import { setInitialLock } from './app/ui/lock/lock-state';
import { pageTransition, sheetEnter, sheetLeave } from './app/ui/motion';

async function start() {
  const container = await createSqliteContainer();
  setDisplayCurrency(await container.currencySettings.get());
  setInitialLock(await container.pinLock.isEnabled(), await container.pinLock.length());
  // La primera vez, la app abre en la bienvenida en vez de Inicio.
  if ((await container.onboarding.needed()) && !location.pathname.startsWith('/bienvenida')) {
    history.replaceState(null, '', '/bienvenida');
  }
  await bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      { provide: APP_CONTAINER, useValue: container },
      provideIonicAngular({ modalEnter: sheetEnter, modalLeave: sheetLeave, navAnimation: pageTransition }),
      provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    ],
  });
}

start().catch((error) => {
  console.error(error);
  document.body.textContent =
    'No se pudo abrir la base de datos local. Cierra y vuelve a abrir la aplicación.';
});
