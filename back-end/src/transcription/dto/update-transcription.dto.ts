import { PartialType } from '@nestjs/mapped-types';
import { CreateTranscriptionDto } from './create-transcription.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTranscriptionDto extends PartialType(CreateTranscriptionDto) {

  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  transcription: string | null;

  status: "recording" | "recorded" | "transcribing" | "ready" | "failed";
}
