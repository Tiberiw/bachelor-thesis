import { Module } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';
import { Consultation } from './entities/consultation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationRepository } from './consultation.repository';
import { TenantContextService } from '../tenant/tenant-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([Consultation])],
  controllers: [ConsultationController],
  providers: [ConsultationService, ConsultationRepository, TenantContextService],
  exports: [ConsultationService],
})
export class ConsultationModule {}
