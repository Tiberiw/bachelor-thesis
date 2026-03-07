import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, tap} from 'rxjs';
import {User} from './user';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {AuthResponse} from './auth-response';
import {UserRegistrationRequest} from './user-registration-request';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api'; // Adjust as needed
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
      this.isAuthenticatedSubject.next(true);
    }
  }

  sendMagicLink(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/magic-link`, {email});
  }

  validateToken(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/verify`, {token})
      .pipe(
        tap(response => this.setAuthData(response))
      );
  }

  private setAuthData(authResponse: AuthResponse): void {
    localStorage.setItem('accessToken', authResponse.accessToken);
    localStorage.setItem('userId', authResponse.userId);
    localStorage.setItem('isNewUser', authResponse.isNewUser ? 'true' : 'false');
    this.isAuthenticatedSubject.next(true);
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isNewUser');

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getCurrentUser(): Observable<User> {
    const userId = this.getUserId();
    return this.http.get<User>(`${this.API_URL}/user/${userId}`).pipe(
      tap((user: User) => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  completeRegistration(request: UserRegistrationRequest): Observable<any> {
    const userId = this.getUserId();
    return this.http.put(`${this.API_URL}/user/${userId}`, request)
      .pipe(tap(() => localStorage.setItem('isNewUser', 'false')));
  }

  isNewUser(): boolean {
    return localStorage.getItem('isNewUser') === 'true';
  }

}
