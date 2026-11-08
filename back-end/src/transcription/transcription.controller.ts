import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { Transcription } from './entities/transcription.entity';
import { UpdateTranscriptionDto } from './dto/update-transcription.dto';

@Controller('transcription')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}


  @Get()
  getAll(): Promise<Transcription[]> {
    return this.transcriptionService.getAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Transcription> {
    return this.transcriptionService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTranscriptionDto: UpdateTranscriptionDto,
  ): Promise<Transcription> {
    return this.transcriptionService.updateTranscription(
      updateTranscriptionDto.id,
      updateTranscriptionDto.transcription,
      updateTranscriptionDto.status
    );
  }

  @Post()
  @UseInterceptors(FileInterceptor('audioBlob', {
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed!'), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    }
  }))
  async createTranscription(
    @Body() createTranscriptionDto: CreateTranscriptionDto,
    @UploadedFile() audioBlob: Express.Multer.File
  ) {
    const transcription = await this.transcriptionService.create(createTranscriptionDto);

    // 2. Process audio file asynchronously
    this.transcriptionService.processAudioFile(transcription.id, audioBlob).catch(error => {console.log(error)});

    return transcription;
  }
}
