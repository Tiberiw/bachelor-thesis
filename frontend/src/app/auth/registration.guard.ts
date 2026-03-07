import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from './auth.service';

export const registrationGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isAuthenticated() && authService.isNewUser()) {
    return true;
  }
  if (authService.isAuthenticated()) {
    router.navigate(['/home']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};
