import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientModule } from './patient/patient.module';
import { TenantContextService } from './tenant/tenant-context.service';
import { ConsultationModule } from './consultation/consultation.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { databaseConfig } from './database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    UserModule,
    AuthModule,
    PatientModule,
    ConsultationModule,
    TranscriptionModule
  ],
  controllers: [AppController],
  providers: [AppService, TenantContextService],
})
export class AppModule {}
