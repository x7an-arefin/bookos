import { Routes } from '@angular/router';
export const importRoutes: Routes = [
  { path: '', loadComponent: () => import('./import.component').then(m => m.ImportComponent) },
];
