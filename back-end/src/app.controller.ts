import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Public health check (Render uses it), also called by the frontend on load to wake things up. */
  @Get('health')
  health(): { status: string } {
    this.appService.wakeAsr();
    return { status: 'ok' };
  }
}
