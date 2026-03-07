import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthService} from '../auth.service';
import {User} from '../user';

@Component({
  selector: 'app-verify-token',
  imports: [],
  templateUrl: './verify-token.component.html',
  styleUrl: './verify-token.component.css'
})
export class VerifyTokenComponent implements OnInit {
  isLoading = true;
  errorMessage = '';

  constructor(private readonly route: ActivatedRoute,
              private readonly router: Router,
              private readonly authService: AuthService) {
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];

    if (token) {
      this.verifyToken(token);
    } else {
      this.errorMessage = 'Invalid verification link';
      this.isLoading = false;
    }
  }

  private verifyToken(token: string): void {
    this.authService.validateToken(token).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.isNewUser) {
          this.router.navigate(['/registration']);
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.errorMessage = 'Invalid or expired verification link';
        this.isLoading = false;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
