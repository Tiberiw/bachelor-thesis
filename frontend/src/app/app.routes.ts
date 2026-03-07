import { Routes } from '@angular/router';
import {LoginComponent} from './auth/login/login.component';
import {VerifyTokenComponent} from './auth/verify-token/verify-token.component';
import {RegistrationComponent} from './auth/registration/registration.component';
import {registrationGuard} from './auth/registration.guard';
import {authGuard} from './auth/auth.guard';
import {guestGuard} from './auth/guest.guard';
import {HomeComponent} from './home/home.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'auth/verify', component: VerifyTokenComponent, canActivate: [guestGuard] },
  {
    path: 'registration',
    component: RegistrationComponent,
    canActivate: [registrationGuard]
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
    loadChildren: () => import('./home/routes').then(m => m.HOME_ROUTES),
  },
  { path: '**', redirectTo: '/login' }
];
