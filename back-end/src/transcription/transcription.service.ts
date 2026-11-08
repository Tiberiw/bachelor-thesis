import { Injectable } from '@nestjs/common';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import { Transcription } from './entities/transcription.entity';
import { TranscriptionRepository } from './transcription.repository';
import { AsrClient } from './asr.client';

@Injectable()
export class TranscriptionService {

  constructor(private readonly transcriptionRepository: TranscriptionRepository,
              private readonly asrClient: AsrClient) {}

  async create(createTranscriptionDto: CreateTranscriptionDto): Promise<Transcription> {
    return await this.transcriptionRepository.createForTenant({
      ...createTranscriptionDto,
      status: 'transcribing',
    });
  }

  async updateTranscription(id: string,
                            transcriptionText: string | null,
                            status: "recording" | "recorded" | "transcribing" | "ready" | "failed"): Promise<Transcription> {
    return await this.transcriptionRepository.updateForTenant(id, {
      transcription: transcriptionText,
      status
    });
  }

  getAll(): Promise<Transcription[]> {
    return this.transcriptionRepository.findAllForTenant();
  }

  findOne(id: string): Promise<Transcription> {
    return this.transcriptionRepository.findOneForTenant(id);
  }

  public async processAudioFile(transcriptionId: string, audioFile: Express.Multer.File) {
    try {
      const text = await this.asrClient.transcribe(audioFile.buffer, audioFile.originalname, audioFile.mimetype);
      await this.updateTranscription(transcriptionId, text, 'ready');
    } catch (error) {
      console.error('Transcription failed:', error instanceof Error ? error.message : error);
      await this.updateTranscription(transcriptionId, null, 'failed');
    }
  }
}
