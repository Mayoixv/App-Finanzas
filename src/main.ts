import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { APP_CONTAINER, createSqliteContainer } from './app/app.container';
import { setDisplayCurrency } from './app/ui/format';
import { setInitialLock } from './app/ui/lock/lock-state';
import { pageTransition, sheetEnter, sheetLeave } from './app/ui/motion';
import { applyPrivacy, isPrivacyOn } from './app/ui/privacy';
import { saveSafetyCopy } from './app/ui/backup-files';
import { loadAppearance } from './app/ui/theme';
import { loadLanguage, t } from './app/ui/i18n';

async function start() {
  const container = await createSqliteContainer(saveSafetyCopy);
  setDisplayCurrency(await container.currencySettings.get());
  await loadAppearance(container.settings);
  await loadLanguage(container.settings);
  setInitialLock(await container.pinLock.isEnabled(), await container.pinLock.length());
  // Antes de mostrar nada, para que el balance no aparezca en la vista de recientes.
  if (await isPrivacyOn(container.settings)) await applyPrivacy(true).catch(console.error);
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
  // El detalle técnico va debajo para poder diagnosticar fallos que solo pasan en el teléfono.
  const detail = error instanceof Error ? error.message : String(error);
  document.body.style.cssText = 'padding:24px;font-family:sans-serif;color:#14121f;background:#e2deee';
  document.body.innerText = t('startup.dbFailed', { detail });
});
