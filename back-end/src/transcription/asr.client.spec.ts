import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AsrClient, parseGradioResult } from './asr.client';

describe('parseGradioResult', () => {
  it('returns the first output of the complete event', () => {
    const sse = 'event: heartbeat\ndata: null\n\nevent: complete\ndata: ["hello world"]\n\n';
    expect(parseGradioResult(sse)).toBe('hello world');
  });

  it('throws when the stream reports an error', () => {
    const sse = 'event: error\ndata: "Could not read the audio file."\n\n';
    expect(() => parseGradioResult(sse)).toThrow('Could not read the audio file.');
  });

  it('throws with the message from an {"error": ...} payload', () => {
    expect(() => parseGradioResult('event: error\ndata: {"error": "No audio received."}\n\n')).toThrow(
      'No audio received.',
    );
    expect(() => parseGradioResult('event: error\ndata: {"error": null}\n\n')).toThrow('unknown error');
  });

  it('throws when the stream has no complete event', () => {
    expect(() => parseGradioResult('event: heartbeat\ndata: null\n\n')).toThrow();
  });
});

describe('AsrClient.transcribe', () => {
  let client: AsrClient;
  const post = jest.fn();
  const get = jest.fn();
  const httpService = { axiosRef: { post, get } };
  const configService = { getOrThrow: jest.fn().mockReturnValue('https://asr.example/') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AsrClient,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    client = module.get(AsrClient);
  });

  it('uploads the audio, starts the transcribe call and returns its text', async () => {
    post
      .mockResolvedValueOnce({ data: ['/tmp/gradio/abc/rec.webm'] })
      .mockResolvedValueOnce({ data: { event_id: 'ev1' } });
    get.mockResolvedValue({ data: 'event: complete\ndata: ["salut"]\n\n' });

    const text = await client.transcribe(Buffer.from('audio'), 'rec.webm', 'audio/webm');

    expect(configService.getOrThrow).toHaveBeenCalledWith('ASR_URL');
    expect(post).toHaveBeenNthCalledWith(
      1,
      'https://asr.example/gradio_api/upload',
      expect.anything(),
      expect.anything(),
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      'https://asr.example/gradio_api/call/transcribe',
      { data: [{ path: '/tmp/gradio/abc/rec.webm', meta: { _type: 'gradio.FileData' } }] },
      expect.anything(),
    );
    expect(get).toHaveBeenCalledWith(
      'https://asr.example/gradio_api/call/transcribe/ev1',
      expect.anything(),
    );
    expect(text).toBe('salut');
  });
});
