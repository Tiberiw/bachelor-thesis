import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transcription } from './entities/transcription.entity';
import { HttpModule } from '@nestjs/axios';
import { TenantContextService } from '../tenant/tenant-context.service';
import { TranscriptionRepository } from './transcription.repository';
import { AsrClient } from './asr.client';

@Module({
  controllers: [TranscriptionController],
  providers: [TranscriptionService, TranscriptionRepository, TenantContextService, AsrClient],
  imports: [TypeOrmModule.forFeature([Transcription]), HttpModule],
})
export class TranscriptionModule {}
