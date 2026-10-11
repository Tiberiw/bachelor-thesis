import { Injectable, Logger } from '@nestjs/common';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { ConsultationRepository } from './consultation.repository';
import { ConsultationResponseDto } from './dto/consultation-response.dto';
import { Consultation } from './entities/consultation.entity';

@Injectable()
export class ConsultationService {
  private readonly logger = new Logger(ConsultationService.name);

  constructor(private readonly consultationRepository: ConsultationRepository) {}

  async create(createConsultationDto: CreateConsultationDto):Promise<ConsultationResponseDto> {
    try {
      const consultation = await this.consultationRepository.createForTenant({
        ...createConsultationDto,
        date: new Date(createConsultationDto.date),
      });
      this.logger.log(`Created consultation with ID: ${consultation.id}`);
      return new ConsultationResponseDto(consultation);
    } catch (error) {
      this.logger.error('Failed to create consultation', error);
      throw error;
    }
  }

  async findAll(): Promise<ConsultationResponseDto[]> {
    try {
      const consultations = await this.consultationRepository.findAllForTenant({
        order: { date: 'DESC' },
      });

      return consultations.map(
        consultation => new ConsultationResponseDto(consultation),
      );
    } catch (error) {
      this.logger.error('Failed to fetch consultations', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<ConsultationResponseDto> {
    try {
      const consultation = await this.consultationRepository.findOneForTenant(id);
      return new ConsultationResponseDto(consultation);
    } catch (error) {
      this.logger.error(`Failed to fetch consultation ${id}`, error);
      throw error;
    }
  }

  async update(id: string, updateConsultationDto: UpdateConsultationDto): Promise<ConsultationResponseDto> {
    try {
      const updateData: Partial<Consultation> = {
        ...updateConsultationDto,
      };

      if (updateConsultationDto.date) {
        updateData.date = new Date(updateConsultationDto.date);
      }

      const consultation = await this.consultationRepository.updateForTenant(
        id,
        updateData,
      );

      this.logger.log(`Updated consultation with ID: ${id}`);
      return new ConsultationResponseDto(consultation);
    } catch (error) {
      this.logger.error(`Failed to update consultation ${id}`, error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.consultationRepository.deleteForTenant(id);
      this.logger.log(`Deleted consultation with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete consultation ${id}`, error);
      throw error;
    }
  }

  async findByDateRange(startDate: string, endDate: string): Promise<ConsultationResponseDto[]> {
    try {
      const consultations = await this.consultationRepository.findByDateRange(
        new Date(startDate),
        new Date(endDate),
      );

      return consultations.map(
        consultation => new ConsultationResponseDto(consultation),
      );
    } catch (error) {
      this.logger.error('Failed to fetch consultations by date range', error);
      throw error;
    }
  }

  async search(searchTerm: string): Promise<ConsultationResponseDto[]> {
    try {
      const consultations = await this.consultationRepository.searchByTitleOrNotes(
        searchTerm,
      );

      return consultations.map(
        consultation => new ConsultationResponseDto(consultation),
      );
    } catch (error) {
      this.logger.error('Failed to search consultations', error);
      throw error;
    }
  }
}
