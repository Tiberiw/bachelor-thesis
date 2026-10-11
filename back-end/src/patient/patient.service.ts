import { Injectable } from '@nestjs/common';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientRepository } from './patient.repository';
import { Patient } from './entities/patient.entity';

@Injectable()
export class PatientService {

  constructor(private readonly patientRepository: PatientRepository) {}

  create(createPatientDto: CreatePatientDto): Promise<Patient> {
    return this.patientRepository.createForTenant({ ...createPatientDto, lastVisit: new Date() });
  }

  findAll(): Promise<Patient[]> {
    return this.patientRepository.findAllForTenant();
  }

  findOne(id: string) {
    return this.patientRepository.findOneForTenant(id);
  }

  update(id: string, updatePatientDto: UpdatePatientDto) {
    return this.patientRepository.updateForTenant(id, updatePatientDto);
  }

  remove(id: string) {
    return this.patientRepository.deleteForTenant(id);
  }
}
