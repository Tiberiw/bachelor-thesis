import {Component, inject} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });
  isLoading = false;
  isSubmitted = false;
  errorMessage = '';

  constructor(private readonly authService: AuthService) {}

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.sendMagicLink(this.loginForm.controls.email.value!).subscribe({
        next: () => {
          this.isSubmitted = true;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to send magic link. Please try again.';
          this.isLoading = false;
        }
      });
    }
  }

  get email() {
    return this.loginForm.get('email');
  }
}
