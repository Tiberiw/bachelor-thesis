import { BaseTenantRepository } from '../tenant/base-tenant.repository';
import { Consultation } from './entities/consultation.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class ConsultationRepository extends BaseTenantRepository<Consultation> {
  constructor(@InjectRepository(Consultation) repository: Repository<Consultation>,
              tenantContext: TenantContextService) {
    super(repository, tenantContext);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Consultation[]> {
    const doctorId = this.tenantContext.getDoctorId();
    return this.repository.createQueryBuilder('consultation')
      .where('consultation.doctorId = :doctorId', { doctorId })
      .andWhere('consultation.date >= :startDate', { startDate })
      .andWhere('consultation.date <= :endDate', { endDate })
      .orderBy('consultation.date', 'DESC')
      .getMany();
  }

  async findByPatientId(patientId: string): Promise<Consultation[]> {
    const doctorId = this.tenantContext.getDoctorId();
    return this.repository.createQueryBuilder('consultation')
      .where('consultation.doctorId = :doctorId', { doctorId })
      .andWhere('consultation.patientId = :patientId', { patientId })
      .orderBy('consultation.date', 'DESC')
      .getMany();
  }

  async searchByTitleOrNotes(searchTerm: string): Promise<Consultation[]> {
    const doctorId = this.tenantContext.getDoctorId();
    return this.repository.createQueryBuilder('consultation')
      .where('consultation.doctorId = :doctorId', { doctorId })
      .andWhere(
        '(consultation.title ILIKE :searchTerm OR consultation.notes ILIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` },
      )
      .orderBy('consultation.date', 'DESC')
      .getMany();
  }
}