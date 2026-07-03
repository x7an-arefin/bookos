import { Routes } from '@angular/router';
export const assetsRoutes: Routes = [
  { path: '', loadComponent: () => import('./assets.component').then(m => m.AssetsComponent) },
];
