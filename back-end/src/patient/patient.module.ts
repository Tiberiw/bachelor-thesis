import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PatientRepository } from './patient.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  controllers: [PatientController],
  providers: [PatientService, PatientRepository, TenantContextService],
  exports: [PatientService]
})
export class PatientModule {}
