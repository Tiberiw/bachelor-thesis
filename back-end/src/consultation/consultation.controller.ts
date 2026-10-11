import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { TenantGuard } from '../tenant/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsultationResponseDto } from './dto/consultation-response.dto';

@Controller('consultation')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createConsultationDto: CreateConsultationDto): Promise<ConsultationResponseDto> {
    return this.consultationService.create(createConsultationDto);
  }

  @Get()
  findAll(): Promise<ConsultationResponseDto[]> {
    return this.consultationService.findAll();
  }

  @Get('search')
  async search(@Query('q') searchTerm: string): Promise<ConsultationResponseDto[]> {
    return this.consultationService.search(searchTerm);
  }

  @Get('date-range')
  async findByDateRange(@Query('startDate') startDate: string,
                        @Query('endDate') endDate: string): Promise<ConsultationResponseDto[]> {
    return this.consultationService.findByDateRange(startDate, endDate);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string,): Promise<ConsultationResponseDto> {
    return this.consultationService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateConsultationDto: UpdateConsultationDto,
  ): Promise<ConsultationResponseDto> {
    return this.consultationService.update(id, updateConsultationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.consultationService.remove(id);
  }
}
