# Replace magic-link login with Sign in with Google

## Goal
Remove the email magic-link login (which sends mail from the developer's Gmail account) and let users sign in with a Google account. The app is not in production, so old auth code and data are hard-deleted with no compatibility handling.

## Unchanged
JWT issuance and format, `JwtStrategy`, `auth.interceptor.ts`, the guards, the registration (profile completion) flow, `localStorage` token storage.

## Flow (Google ID-token approach)
1. The login page shows Google's button (script `https://accounts.google.com/gsi/client`).
2. On success Google returns a signed ID token (`credential`) to the browser.
3. Frontend sends `POST /api/auth/google` with `{ credential }`.
4. Back-end verifies the token, finds or creates the user, and returns the existing `AuthResponseDto` (`userId`, `accessToken`, `isNewUser`).
5. Frontend stores it via the existing `setAuthData`, then navigates: `isNewUser` -> `/registration`, otherwise `/home`.

## Back-end (`back-end/`)
- Add dependency `google-auth-library`.
- `auth/dto/google-login.dto.ts`: `{ credential: string }` (class-validator, non-empty string).
- `AuthController`: replace the two magic-link routes with `POST auth/google`.
- `AuthService.loginWithGoogle(credential)`:
  - `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`; wrap failures in `UnauthorizedException`.
  - Require `email` present and `email_verified === true`, else `UnauthorizedException`.
  - Look up the user by email (`userService.findByEmail`); if absent, `userService.createUser(email)` and set `firstName`/`lastName` from the profile (`given_name`, `family_name`).
  - `updateLastLogin`, sign `{ email, sub }` with `JwtService`, return `{ userId, accessToken, isNewUser: isNewUser || !user.profileCompleted }` (same rule as today).
- `OAuth2Client` is created from `ConfigService.getOrThrow('GOOGLE_CLIENT_ID')` in the `AuthService` constructor so tests can inject a mock.
- Delete: `auth/entities/magic-link.entity.ts`, `auth/dto/magic-link-request.dto.ts`, `auth/dto/verify-token.dto.ts`, `src/mail/` and its import in `AuthModule`/`AppModule`, the `TypeOrmModule.forFeature([MagicLink])` registration. Remove `nodemailer` (and `@types/nodemailer`) and `uuid` if no longer used.
- Config: add `GOOGLE_CLIENT_ID` to `back-end/.env.example`; remove `MAIL_USER`, `MAIL_APP_PASSWORD`. `FRONTEND_URL` stays (CORS).
- The `magic_link` table is dropped by wiping the dev database (or `DROP TABLE magic_link`); TypeORM `synchronize` will not remove it.

## Frontend (`frontend/`)
- `login.component`: remove the email form and its states; render the Google button, initialised with the client ID, with a callback calling `AuthService.loginWithGoogle(credential)`. Show "Google sign-in failed. Please try again." on error.
- `AuthService`: replace `sendMagicLink` and `validateToken` with `loginWithGoogle(credential)` that posts to `/auth/google` and reuses `setAuthData`.
- Delete `auth/verify-token/` and its route in `app.routes.ts`.
- The Google client ID (a public value) lives in one exported constant, since the project has no Angular environment files.

## Errors
Invalid/expired token, wrong audience, missing or unverified email -> 401; the UI shows the generic failure message.

## Testing
- Back-end unit tests for `AuthService.loginWithGoogle` with a mocked `OAuth2Client`: new user, existing user, rejected token, unverified email.
- `npm run build` and `npm run lint` in `back-end/`; `npm run build` in `frontend/`.
- Manual end-to-end with a real client ID.

## Manual prerequisites (outside the repo)
In Google Cloud Console: create a project, configure the OAuth consent screen, create an OAuth client ID of type "Web application", and add `http://localhost:4200` as an Authorised JavaScript origin (plus the production origin later). No client secret or redirect URI is needed.

## Out of scope
Keeping magic link as a fallback, other providers, refresh tokens, moving token storage out of `localStorage`.
