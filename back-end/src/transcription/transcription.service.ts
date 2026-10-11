import { Injectable } from '@nestjs/common';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import { Transcription } from './entities/transcription.entity';
import { TranscriptionRepository } from './transcription.repository';
import { map, Observable, Subject } from 'rxjs';
import * as FormData from 'form-data';
import { HttpService } from '@nestjs/axios';

type TranscriptionResponse = {
  transcription: string;
};

@Injectable()
export class TranscriptionService {

  constructor(private readonly transcriptionRepository: TranscriptionRepository,
              private readonly httpService: HttpService) {}

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
      // Create FormData for the ML API call
      const formData = new FormData();
      formData.append('file', audioFile.buffer, {
        filename: audioFile.originalname,
        contentType: audioFile.mimetype
      });

      // Call your ML transcription endpoint
      const response = await this.httpService.axiosRef.post<TranscriptionResponse>(
        'https://tiberiw-thesis.hf.space/api/transcription',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 300000, // 5 minutes timeout
        }
      );
      console.log("Response from ml")
      console.log(response.data);
      const transcriptionText = response.data.transcription;

      // Update the transcription record
      const updatedTranscription = await this.updateTranscription(
        transcriptionId,
        transcriptionText,
        'ready'
      );

    } catch (error) {
      console.error('Transcription failed:', error);
      const failedTranscription = await this.updateTranscription(transcriptionId, null, 'failed');

    }
  }
}
