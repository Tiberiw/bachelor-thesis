import {AfterViewInit, Component, ElementRef, NgZone, ViewChild, inject} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '../auth.service';
import {GoogleIdentityService} from '../google-identity.service';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  isLoading = false;
  errorMessage = '';

  ngAfterViewInit(): void {
    this.googleIdentity
      .renderButton(this.googleButton.nativeElement, credential => this.zone.run(() => this.onCredential(credential)))
      .catch(() => {
        this.errorMessage = 'Could not load Google sign-in. Check your connection or ad blocker and reload.';
      });
  }

  private onCredential(credential: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.loginWithGoogle(credential).subscribe({
      next: response => {
        this.isLoading = false;
        this.router.navigate([response.isNewUser ? '/registration' : '/home']);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Google sign-in failed. Please try again.';
      }
    });
  }
}
