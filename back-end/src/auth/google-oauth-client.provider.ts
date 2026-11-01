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
