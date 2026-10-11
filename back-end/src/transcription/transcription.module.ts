import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transcription } from './entities/transcription.entity';
import { HttpModule } from '@nestjs/axios';
import { TenantContextService } from '../tenant/tenant-context.service';
import { TranscriptionRepository } from './transcription.repository';

@Module({
  controllers: [TranscriptionController],
  providers: [TranscriptionService, TranscriptionRepository, TenantContextService],
  imports: [TypeOrmModule.forFeature([Transcription]), HttpModule],
})
export class TranscriptionModule {}
