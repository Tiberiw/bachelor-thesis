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
