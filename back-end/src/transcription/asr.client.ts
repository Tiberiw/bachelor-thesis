import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';

const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Reads the result of a Gradio call from its server-sent-events body.
 * The body is a list of `event: <name>` / `data: <json>` pairs; the answer is
 * the first output of the `complete` event.
 */
export function parseGradioResult(sse: string): string {
  let event = '';
  for (const line of sse.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      const data = line.slice('data:'.length).trim();
      if (event === 'complete') {
        const outputs = JSON.parse(data) as unknown[];
        return String(outputs[0]);
      }
      if (event === 'error') {
        // Gradio sends either a plain string or {"error": <message or null>}.
        const parsed = data ? (JSON.parse(data) as unknown) : null;
        const detail =
          parsed && typeof parsed === 'object' ? (parsed as { error?: unknown }).error : parsed;
        throw new Error(`ASR service error: ${typeof detail === 'string' ? detail : 'unknown error'}`);
      }
    }
  }
  throw new Error('ASR service returned no result');
}

/** Client for the Gradio ASR Space (model-inference/), whose base URL is ASR_URL. */
@Injectable()
export class AsrClient {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async transcribe(audio: Buffer, filename: string, contentType: string): Promise<string> {
    const baseUrl = this.configService.getOrThrow<string>('ASR_URL').replace(/\/+$/, '');
    const http = this.httpService.axiosRef;

    // 1. Upload the file; Gradio returns its server-side path.
    const form = new FormData();
    form.append('files', audio, { filename, contentType });
    const upload = await http.post<string[]>(`${baseUrl}/gradio_api/upload`, form, {
      headers: form.getHeaders(),
      timeout: TIMEOUT_MS,
    });

    // 2. Start the transcribe call with that file.
    const call = await http.post<{ event_id: string }>(
      `${baseUrl}/gradio_api/call/transcribe`,
      { data: [{ path: upload.data[0], meta: { _type: 'gradio.FileData' } }] },
      { timeout: TIMEOUT_MS },
    );

    // 3. Read the result stream; it ends when the call finishes.
    const result = await http.get<string>(
      `${baseUrl}/gradio_api/call/transcribe/${call.data.event_id}`,
      { responseType: 'text', timeout: TIMEOUT_MS },
    );
    return parseGradioResult(result.data);
  }
}
