import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTranscriptionDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsNotEmpty()
  status: "recording" | "recorded" | "transcribing" | "ready" | "failed";

  @IsNotEmpty()
  duration: number;
}
