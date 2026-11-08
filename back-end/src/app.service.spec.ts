import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

describe('AppService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('ok'));
  });

  afterEach(() => jest.restoreAllMocks());

  it('pings the ASR service at most once every few minutes', () => {
    const service = new AppService(new ConfigService({ ASR_URL: 'https://asr.example' }));

    service.wakeAsr();
    service.wakeAsr();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://asr.example', expect.anything());
  });

  it('does not throw when the ping fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const service = new AppService(new ConfigService({ ASR_URL: 'https://asr.example' }));

    expect(() => service.wakeAsr()).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });
});
