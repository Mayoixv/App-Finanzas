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
        path: 'dinero',
        loadComponent: () => import('./ui/dinero/dinero.page').then((m) => m.DineroPage),
      },
      // Direcciones viejas: llevan a la sección correspondiente de Dinero.
      { path: 'ahorro', redirectTo: '/tabs/dinero?ver=metas' },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  {
    path: 'ajustes/categorias',
    loadComponent: () => import('./ui/ajustes/categorias.page').then((m) => m.CategoriasPage),
  },
  {
    path: 'ajustes',
    loadComponent: () => import('./ui/ajustes/ajustes.page').then((m) => m.AjustesPage),
  },
  {
    path: 'reportes',
    loadComponent: () => import('./ui/reportes/reportes.page').then((m) => m.ReportesPage),
  },
  {
    path: 'bienvenida',
    loadComponent: () => import('./ui/bienvenida/bienvenida.page').then((m) => m.BienvenidaPage),
  },
  { path: 'cuentas', redirectTo: '/tabs/dinero?ver=cuentas' },
  { path: 'deudas', redirectTo: '/tabs/dinero?ver=deudas' },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
];
