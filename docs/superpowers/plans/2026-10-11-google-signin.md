# Sign in with Google Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the email magic-link login with Google ID-token sign-in, deleting all magic-link/mail code.

**Architecture:** The frontend shows Google's button and posts the returned ID token to `POST /api/auth/google`. The back-end verifies it with `google-auth-library`, finds or creates the user by email, and returns the existing `AuthResponseDto` with the same JWT, so guards, interceptor and registration flow are untouched.

**Tech Stack:** NestJS 11, TypeORM, jest/ts-jest, `google-auth-library`; Angular 19, Google Identity Services script.

**Spec:** `docs/superpowers/specs/2026-10-11-google-signin-design.md`

## Global Constraints
- Run back-end commands from `back-end/`, frontend commands from `frontend/`. Never read or print `.env` files.
- New env var `GOOGLE_CLIENT_ID` is read with `ConfigService.getOrThrow` (no fallback). No client secret is used.
- JWT payload stays `{ email, sub }`; response stays `AuthResponseDto(accessToken, userId, isNewUser)`.
- Not in production: delete magic-link code and the `magic_link` table outright, no compatibility shims.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus
- Google token with `email_verified: false` or no email -> 401 (Task 1 tests).
- Token for a different audience / invalid signature -> 401, not a 500 (Task 1 test: `verifyIdToken` rejects).
- Empty or missing `credential` body -> 400 from `ValidationPipe` (Task 2 DTO uses `@IsNotEmpty`).
- Existing user who finished their profile logs in with `isNewUser: false` (Task 1 test).
- Google profile without `given_name`/`family_name` still creates a user (Task 1 test).
- Google script blocked or failing to load -> login page shows an error instead of an empty page (Task 3).

---

### Task 1: `AuthService.loginWithGoogle` (back-end, TDD)

**Files:**
- Create: `back-end/src/auth/google-oauth-client.provider.ts`
- Create: `back-end/src/auth/auth.service.spec.ts`
- Modify: `back-end/src/auth/auth.service.ts`, `back-end/src/user/user.service.ts:23-26`

**Interfaces:**
- Produces: `GOOGLE_OAUTH_CLIENT` (string token), `googleOAuthClientProvider: Provider`, `AuthService.loginWithGoogle(credential: string): Promise<AuthResponseDto>`, `UserService.createUser(email: string, profile?: { firstName?: string; lastName?: string }): Promise<User>`.

- [ ] **Step 1: Install dependency**

Run: `npm install google-auth-library`
Expected: added to `dependencies` in `package.json`.

- [ ] **Step 2: Create the client provider**

`back-end/src/auth/google-oauth-client.provider.ts`:
```ts
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export const GOOGLE_OAUTH_CLIENT = 'GOOGLE_OAUTH_CLIENT';

export const googleOAuthClientProvider: Provider = {
  provide: GOOGLE_OAUTH_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    new OAuth2Client(configService.getOrThrow<string>('GOOGLE_CLIENT_ID')),
};
```

- [ ] **Step 3: Extend `createUser`**

In `back-end/src/user/user.service.ts` replace `createUser`:
```ts
  async createUser(email: string, profile?: { firstName?: string; lastName?: string }): Promise<User> {
    const user = this.userRepository.create({ email, ...profile });
    return this.userRepository.save(user);
  }
```

- [ ] **Step 4: Write the failing tests**

`back-end/src/auth/auth.service.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { GOOGLE_OAUTH_CLIENT } from './google-oauth-client.provider';

describe('AuthService.loginWithGoogle', () => {
  let service: AuthService;

  const googleClient = { verifyIdToken: jest.fn() };
  const userService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    updateLastLogin: jest.fn(),
  };
  const jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
  const configService = { getOrThrow: jest.fn().mockReturnValue('test-client-id') };

  const ticketFor = (payload: object | undefined) => ({ getPayload: () => payload });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: GOOGLE_OAUTH_CLIENT, useValue: googleClient },
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('creates a new user from a verified Google profile', async () => {
    googleClient.verifyIdToken.mockResolvedValue(
      ticketFor({ email: 'a@b.com', email_verified: true, given_name: 'Ana', family_name: 'Pop' }),
    );
    userService.findByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({ id: 'u1', email: 'a@b.com', profileCompleted: false });

    const result = await service.loginWithGoogle('cred');

    expect(googleClient.verifyIdToken).toHaveBeenCalledWith({ idToken: 'cred', audience: 'test-client-id' });
    expect(userService.createUser).toHaveBeenCalledWith('a@b.com', { firstName: 'Ana', lastName: 'Pop' });
    expect(jwtService.sign).toHaveBeenCalledWith({ email: 'a@b.com', sub: 'u1' });
    expect(result).toEqual({ accessToken: 'jwt-token', userId: 'u1', isNewUser: true });
  });

  it('creates a user when Google gives no given_name/family_name', async () => {
    googleClient.verifyIdToken.mockResolvedValue(ticketFor({ email: 'a@b.com', email_verified: true }));
    userService.findByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({ id: 'u1', email: 'a@b.com', profileCompleted: false });

    await service.loginWithGoogle('cred');

    expect(userService.createUser).toHaveBeenCalledWith('a@b.com', { firstName: undefined, lastName: undefined });
  });

  it('logs in an existing user with a completed profile as not new', async () => {
    googleClient.verifyIdToken.mockResolvedValue(ticketFor({ email: 'a@b.com', email_verified: true }));
    userService.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', profileCompleted: true });

    const result = await service.loginWithGoogle('cred');

    expect(userService.createUser).not.toHaveBeenCalled();
    expect(userService.updateLastLogin).toHaveBeenCalledWith('u1');
    expect(result.isNewUser).toBe(false);
  });

  it('treats an existing user with an incomplete profile as new', async () => {
    googleClient.verifyIdToken.mockResolvedValue(ticketFor({ email: 'a@b.com', email_verified: true }));
    userService.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', profileCompleted: false });

    const result = await service.loginWithGoogle('cred');

    expect(result.isNewUser).toBe(true);
  });

  it('rejects a token Google refuses to verify', async () => {
    googleClient.verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));
    await expect(service.loginWithGoogle('bad')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userService.findByEmail).not.toHaveBeenCalled();
  });

  it('rejects an unverified email', async () => {
    googleClient.verifyIdToken.mockResolvedValue(ticketFor({ email: 'a@b.com', email_verified: false }));
    await expect(service.loginWithGoogle('cred')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token with no payload or no email', async () => {
    googleClient.verifyIdToken.mockResolvedValue(ticketFor(undefined));
    await expect(service.loginWithGoogle('cred')).rejects.toBeInstanceOf(UnauthorizedException);
    googleClient.verifyIdToken.mockResolvedValue(ticketFor({ email_verified: true }));
    await expect(service.loginWithGoogle('cred')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 5: Run to verify failure**

Run: `npx jest src/auth/auth.service.spec.ts`
Expected: FAIL (`loginWithGoogle` does not exist / constructor mismatch).

- [ ] **Step 6: Rewrite `AuthService`**

Replace the whole of `back-end/src/auth/auth.service.ts`:
```ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { UserService } from '../user/user.service';
import { Payload } from './interfaces/payload';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GOOGLE_OAUTH_CLIENT } from './google-oauth-client.provider';

@Injectable()
export class AuthService {
  private readonly googleClientId: string;

  constructor(
    @Inject(GOOGLE_OAUTH_CLIENT) private readonly googleClient: OAuth2Client,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.googleClientId = configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
  }

  async loginWithGoogle(credential: string): Promise<AuthResponseDto> {
    const profile = await this.verifyGoogleCredential(credential);

    let user = await this.userService.findByEmail(profile.email);
    let isNewUser = false;
    if (!user) {
      user = await this.userService.createUser(profile.email, {
        firstName: profile.given_name,
        lastName: profile.family_name,
      });
      isNewUser = true;
    }

    await this.userService.updateLastLogin(user.id);

    const payload: Payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    return new AuthResponseDto(accessToken, user.id, isNewUser || !user.profileCompleted);
  }

  private async verifyGoogleCredential(credential: string): Promise<TokenPayload & { email: string }> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }
    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Google account email is not verified');
    }
    return payload as TokenPayload & { email: string };
  }
}
```

- [ ] **Step 7: Run tests to verify pass**

Run: `npx jest src/auth/auth.service.spec.ts`
Expected: PASS (7 tests). Note `npm run build` is expected to fail until Task 2 wires the module.

- [ ] **Step 8: Commit**

```bash
git add back-end/package.json back-end/package-lock.json back-end/src/auth/auth.service.ts back-end/src/auth/auth.service.spec.ts back-end/src/auth/google-oauth-client.provider.ts back-end/src/user/user.service.ts
git commit -m "feat(auth): verify Google ID tokens and log users in

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Wire endpoint, delete magic-link and mail code (back-end)

**Files:**
- Create: `back-end/src/auth/dto/google-login.dto.ts`
- Modify: `back-end/src/auth/auth.controller.ts`, `back-end/src/auth/auth.module.ts`, `back-end/src/app.module.ts`, `back-end/.env.example`, `back-end/package.json`
- Delete: `back-end/src/auth/entities/magic-link.entity.ts`, `back-end/src/auth/dto/magic-link-request.dto.ts`, `back-end/src/auth/dto/verify-token.dto.ts`, `back-end/src/mail/` (whole dir)

**Interfaces:**
- Consumes: `AuthService.loginWithGoogle`, `googleOAuthClientProvider` from Task 1.
- Produces: `POST /api/auth/google` body `{ credential: string }` -> `AuthResponseDto`.

- [ ] **Step 1: Delete old files**

Run: `git rm -r src/mail src/auth/entities/magic-link.entity.ts src/auth/dto/magic-link-request.dto.ts src/auth/dto/verify-token.dto.ts`

- [ ] **Step 2: Create DTO**

`back-end/src/auth/dto/google-login.dto.ts`:
```ts
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsNotEmpty()
  @IsString()
  credential: string;
}
```

- [ ] **Step 3: Replace the controller**

`back-end/src/auth/auth.controller.ts`:
```ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(200)
  async googleLogin(@Body() { credential }: GoogleLoginDto) {
    return this.authService.loginWithGoogle(credential);
  }
}
```

- [ ] **Step 4: Update `AuthModule`**

Remove the imports/uses of `MagicLink`, `TypeOrmModule`, `MailModule`; add the provider. Resulting `back-end/src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { googleOAuthClientProvider } from './google-oauth-client.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '8h'),
        },
      }),
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, googleOAuthClientProvider],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 5: Update `AppModule`**

In `back-end/src/app.module.ts` delete `import { MailModule } from './mail/mail.module';` and `MailModule,` from `imports`.

- [ ] **Step 6: Remove unused packages**

Run: `npm uninstall nodemailer @types/nodemailer uuid @types/uuid`
Then confirm nothing imports them: Grep `from 'uuid'|nodemailer` in `back-end/src` -> no matches.

- [ ] **Step 7: Update env example**

In `back-end/.env.example` delete the `MAIL_USER=` and `MAIL_APP_PASSWORD=` lines and add `GOOGLE_CLIENT_ID=`.

- [ ] **Step 8: Verify**

Run: `npm run build && npx jest`
Expected: build succeeds; all jest suites pass (patient specs plus the new auth spec).

- [ ] **Step 9: Commit**

```bash
git add -A back-end
git commit -m "feat(auth): add POST /auth/google and remove magic-link and mail code

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Google button on the login page (frontend)

**Files:**
- Create: `frontend/src/app/auth/google-identity.service.ts`, `frontend/src/app/auth/google-client-id.ts`
- Modify: `frontend/src/app/auth/auth.service.ts`, `frontend/src/app/auth/login/login.component.ts`, `frontend/src/app/auth/login/login.component.html`, `frontend/src/app/app.routes.ts`
- Delete: `frontend/src/app/auth/verify-token/` (whole dir)

**Interfaces:**
- Consumes: `POST /api/auth/google` from Task 2.
- Produces: `AuthService.loginWithGoogle(credential: string): Observable<AuthResponse>`; `GoogleIdentityService.renderButton(host: HTMLElement, onCredential: (credential: string) => void): Promise<void>` (rejects if the script cannot load).

- [ ] **Step 1: Client ID constant**

`frontend/src/app/auth/google-client-id.ts`:
```ts
// Public OAuth client ID (Google Cloud Console > Credentials > Web application).
export const GOOGLE_CLIENT_ID = 'REPLACE_WITH_GOOGLE_CLIENT_ID';
```
(This literal is the one intentional placeholder; the user replaces it with the real ID before the manual test.)

- [ ] **Step 2: Script loader and button service**

`frontend/src/app/auth/google-identity.service.ts`:
```ts
import { Injectable } from '@angular/core';
import { GOOGLE_CLIENT_ID } from './google-client-id';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private scriptPromise?: Promise<void>;

  private loadScript(): Promise<void> {
    this.scriptPromise ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        this.scriptPromise = undefined;
        reject(new Error('Failed to load Google sign-in'));
      };
      document.head.appendChild(script);
    });
    return this.scriptPromise;
  }

  async renderButton(host: HTMLElement, onCredential: (credential: string) => void): Promise<void> {
    await this.loadScript();
    const google = (window as any).google;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => onCredential(response.credential),
    });
    google.accounts.id.renderButton(host, { theme: 'outline', size: 'large', text: 'signin_with', width: 320 });
  }
}
```

- [ ] **Step 3: Update `AuthService`**

In `frontend/src/app/auth/auth.service.ts` replace `sendMagicLink` and `validateToken` with:
```ts
  loginWithGoogle(credential: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/google`, {credential})
      .pipe(
        tap(response => this.setAuthData(response))
      );
  }
```

- [ ] **Step 4: Rewrite the login component**

`frontend/src/app/auth/login/login.component.ts`:
```ts
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
```

- [ ] **Step 5: Replace the form in the template**

In `frontend/src/app/auth/login/login.component.html` keep the header block, delete the "Success Message" block and the whole `@if (!isSubmitted) { ... }` block, and put this after the header inside the `max-w-md` container:
```html
    <div class="card p-8">
      <div class="flex justify-center" #googleButton></div>

      @if (isLoading) {
        <p class="mt-4 text-center text-sm text-gray-600">Signing you in...</p>
      }
      @if (errorMessage) {
        <p class="mt-4 text-center text-sm text-red-600">{{ errorMessage }}</p>
      }

      <div class="mt-6 text-center">
        <p class="text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
```

- [ ] **Step 6: Remove the verify route and component**

Run: `git rm -r frontend/src/app/auth/verify-token`
In `frontend/src/app/app.routes.ts` delete the `VerifyTokenComponent` import and the `{ path: 'auth/verify', ... }` line.

- [ ] **Step 7: Verify build**

Run (from `frontend/`): `npm run build`
Expected: build succeeds with no reference to `VerifyTokenComponent`, `sendMagicLink` or `validateToken` (Grep `frontend/src` for those names -> no matches).

- [ ] **Step 8: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): sign in with Google, remove magic-link pages

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Docs and manual verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1:** In `CLAUDE.md` change the back-end line and secrets gotcha: replace "JWT magic-link auth" with "Google sign-in (ID token) + JWT", and replace `MAIL_USER` and `MAIL_APP_PASSWORD` in the `getOrThrow` list with `GOOGLE_CLIENT_ID`.
- [ ] **Step 2:** Drop the old dev tables: connect to the dev Postgres and run `DROP TABLE IF EXISTS magic_link;` (or wipe the dev DB and let TypeORM recreate it). Ask the user to do this or confirm before running anything against their database.
- [ ] **Step 3 (user):** Create the Google OAuth client ID (see spec "Manual prerequisites"), put it in `back-end/.env` as `GOOGLE_CLIENT_ID` and in `frontend/src/app/auth/google-client-id.ts`.
- [ ] **Step 4:** Manual end-to-end: start Postgres, `npm run start:dev` in `back-end/`, `npm start` in `frontend/`; sign in with a Google account; confirm a new account lands on `/registration`, a returning completed account lands on `/home`, and a second browser profile with a blocked Google script shows the error message.
- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Google sign-in

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
