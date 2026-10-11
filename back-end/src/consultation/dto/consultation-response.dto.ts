export class ConsultationResponseDto {
  id: string;
  transcription: string;
  date: Date;
  title: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ConsultationResponseDto>) {
    Object.assign(this, partial);
  }
}