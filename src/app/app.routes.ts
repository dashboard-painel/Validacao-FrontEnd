import { Routes } from '@angular/router';

import { Dashboard } from './views/dashboard/dashboard';
import { Vendas } from './views/vendas/vendas';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'vendas', component: Vendas },
  { path: '**', redirectTo: '/dashboard' },
];
