import { ConfigService } from '@nestjs/config';
import { databaseConfig } from './database.config';

describe('databaseConfig', () => {
  it('uses DATABASE_URL over SSL when it is set', () => {
    const config = databaseConfig(new ConfigService({ DATABASE_URL: 'postgresql://u:p@db.example/thesis' }));

    expect(config).toMatchObject({ url: 'postgresql://u:p@db.example/thesis', ssl: true });
    expect(config).not.toHaveProperty('host');
  });

  it('uses the DB_* variables otherwise', () => {
    const config = databaseConfig(new ConfigService({ DB_HOST: 'localhost', DB_PASSWORD: 'secret' }));

    expect(config).toMatchObject({ host: 'localhost', password: 'secret' });
    expect(config).not.toHaveProperty('url');
  });

  it('requires DB_PASSWORD when there is no DATABASE_URL', () => {
    expect(() => databaseConfig(new ConfigService({}))).toThrow();
  });
});
