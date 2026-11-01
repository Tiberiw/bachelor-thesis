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
