import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const WAKE_INTERVAL_MS = 5 * 60 * 1000;
const WAKE_TIMEOUT_MS = 2 * 60 * 1000;

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private lastWake = 0;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Pings the ASR service so a sleeping Space starts booting before the first transcription.
   * Fire-and-forget, at most once every few minutes.
   */
  wakeAsr(): void {
    const now = Date.now();
    if (now - this.lastWake < WAKE_INTERVAL_MS) return;
    this.lastWake = now;

    const url = this.configService.getOrThrow<string>('ASR_URL');
    fetch(url, { signal: AbortSignal.timeout(WAKE_TIMEOUT_MS) }).catch((error: unknown) =>
      this.logger.warn(`ASR wake-up ping failed: ${error instanceof Error ? error.message : 'unknown error'}`),
    );
  }
}
