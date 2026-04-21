import { ConfigService } from '@nestjs/config';
import { OpenRouterService } from './openrouter.service';

describe('OpenRouterService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retries without json mode when the first response has empty content', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'minimax/minimax-m2.5-20260211:free',
          provider: 'OpenInference',
          choices: [
            {
              message: {
                content: null,
                reasoning: null,
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'minimax/minimax-m2.5-20260211:free',
          provider: 'OpenInference',
          choices: [
            {
              message: {
                content:
                  '{"taskType":"generate-page","summary":"ok","patches":[{"id":1,"name":"Page","props":{},"desc":"页面"}],"warnings":[],"confidence":0.8}',
              },
            },
          ],
        }),
      });

    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(fetchMock as unknown as typeof fetch);

    const service = new OpenRouterService({
      get: (key: string) => {
        if (key === 'OPENROUTER_API_KEY') return 'test-key';
        if (key === 'OPENROUTER_MODEL') return 'minimax/minimax-m2.5:free';
        if (key === 'OPENROUTER_TIMEOUT_MS') return '1000';
        return undefined;
      },
    } as unknown as ConfigService);

    const result = await service.generate('test prompt');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(firstBody.response_format).toEqual({ type: 'json_object' });
    expect(secondBody.response_format).toBeUndefined();
    expect(result.content).toContain('"taskType":"generate-page"');
  });
});
