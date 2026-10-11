import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateConsultationDto } from './create-consultation.dto';

export class UpdateConsultationDto extends PartialType(
  OmitType(CreateConsultationDto, [] as const),
) {}