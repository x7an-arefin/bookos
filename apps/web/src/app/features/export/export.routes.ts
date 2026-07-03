import { Routes } from '@angular/router';
export const exportRoutes: Routes = [
  { path: '', loadComponent: () => import('./export.component').then(m => m.ExportComponent) },
];
