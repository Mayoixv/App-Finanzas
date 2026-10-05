import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./ui/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'inicio',
        loadComponent: () => import('./ui/inicio/inicio.page').then((m) => m.InicioPage),
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./ui/movimientos/movimientos.page').then((m) => m.MovimientosPage),
      },
      {
        path: 'fijos',
        loadComponent: () => import('./ui/fijos/fijos.page').then((m) => m.FijosPage),
      },
      {
        path: 'ahorro',
        loadComponent: () => import('./ui/ahorro/ahorro.page').then((m) => m.AhorroPage),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  {
    path: 'ajustes',
    loadComponent: () => import('./ui/ajustes/ajustes.page').then((m) => m.AjustesPage),
  },
  {
    path: 'bienvenida',
    loadComponent: () => import('./ui/bienvenida/bienvenida.page').then((m) => m.BienvenidaPage),
  },
  {
    path: 'deudas',
    loadComponent: () => import('./ui/deudas/deudas.page').then((m) => m.DeudasPage),
  },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
];
