import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

  // Enable CORS
  // FRONTEND_URL may list several origins, comma-separated.
  app.enableCors({
    origin: configService
      .getOrThrow<string>('FRONTEND_URL')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Add global prefix
  app.setGlobalPrefix('api');

  const port: number = configService.get('PORT', 3000);

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);

}
bootstrap();
