import { BaseTenantRepository } from '../tenant/base-tenant.repository';
import { Patient } from './entities/patient.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../tenant/tenant-context.service';

export class PatientRepository extends BaseTenantRepository<Patient> {
  constructor(@InjectRepository(Patient) repository: Repository<Patient>,
              tenantContext: TenantContextService) {
    super(repository, tenantContext);
  }
}