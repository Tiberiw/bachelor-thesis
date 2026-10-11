import { Injectable } from '@nestjs/common';
import { BaseTenantRepository } from '../tenant/base-tenant.repository';
import { Transcription } from './entities/transcription.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class TranscriptionRepository extends BaseTenantRepository<Transcription> {
  constructor(@InjectRepository(Transcription) repository: Repository<Transcription>,
              tenantContext: TenantContextService) {
    super(repository, tenantContext);
  }
}