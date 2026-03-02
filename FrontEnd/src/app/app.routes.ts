import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
      }
    ]
  },
  {
    path: 'devices',
    canActivate: [authGuard],
    loadComponent: () => import('./devices/device-list/device-list.component').then(m => m.DeviceListComponent)
  },
  {
    path: 'detail/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./detail/device-detail/device-detail.component').then(m => m.DeviceDetailComponent)
  },
  {
    path: '',
    redirectTo: 'devices',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
