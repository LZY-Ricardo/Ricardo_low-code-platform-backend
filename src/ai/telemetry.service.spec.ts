import { existsSync, mkdtempSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigService } from '@nestjs/config';
import { AiTelemetryService } from './telemetry.service';

describe('AiTelemetryService', () => {
  it('writes workbench task telemetry to disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lingocode-ai-telemetry-'));
    const filePath = join(dir, 'telemetry.jsonl');
    const service = new AiTelemetryService({
      get: (key: string) => {
        if (key === 'AI_TELEMETRY_LOG_PATH') {
          return filePath;
        }
        return undefined;
      },
    } as unknown as ConfigService);

    await service.recordTask({
      taskType: 'generate-page',
      status: 'success',
      durationMs: 123,
      source: 'openrouter',
    });

    expect(existsSync(filePath)).toBe(true);
    const line = readFileSync(filePath, 'utf8').trim();
    const parsed = JSON.parse(line);
    expect(parsed.taskType).toBe('generate-page');
    expect(parsed.durationMs).toBe(123);
  });
});
