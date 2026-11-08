import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Postgres connection. In production, DATABASE_URL (e.g. from Neon) is used, over SSL.
 * Locally, the separate DB_* variables are used instead.
 */
export function databaseConfig(configService: ConfigService): TypeOrmModuleOptions {
  const common = {
    type: 'postgres' as const,
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
  };

  const url = configService.get<string>('DATABASE_URL');
  if (url) {
    return { ...common, url, ssl: true };
  }

  return {
    ...common,
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.getOrThrow<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE', 'thesis'),
  };
}
