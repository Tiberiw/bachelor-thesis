import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConsultationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(10000)
  transcription: string;

  @IsNotEmpty()
  date: Date;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}